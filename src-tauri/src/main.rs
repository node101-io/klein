#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde_json::{self, Value};
use ssh2::{DisconnectCode, Session};
use std::io::{prelude::Read, Write};
use tauri::{regex, LogicalSize, Manager};

struct SessionManager {
    open_session: Session,
    stop_cpu_mem_sync: bool,
    walletpassword: String,
}
static mut GLOBAL_STRUCT: Option<SessionManager> = None;

#[tauri::command(async)]
fn log_in(ip: String, password: String) -> (bool, String) {
    let tcp = std::net::TcpStream::connect(format!("{ip}:22")).unwrap();
    tcp.set_read_timeout(Some(std::time::Duration::from_secs(1)))
        .unwrap();
    let mut sess = Session::new().unwrap();
    sess.set_tcp_stream(tcp);
    sess.handshake().unwrap();
    let res = sess.userauth_password("root", &password);
    if res.is_ok() {
        unsafe {
            GLOBAL_STRUCT = Some(SessionManager {
                open_session: sess,
                stop_cpu_mem_sync: false,
                walletpassword: String::new(),
            });
        }
        if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel.exec("bash -c -l 'echo $EXECUTE'").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            channel.close().unwrap();
            (true, s.trim().to_string())
        } else {
            (false, String::new())
        }
    } else {
        (false, String::new())
    }
}

#[tauri::command(async)]
fn log_out() {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        (*my_boxed_session)
            .open_session
            .disconnect(
                Some(DisconnectCode::AuthCancelledByUser),
                "Disconnecting from server",
                None,
            )
            .unwrap();
        unsafe {
            GLOBAL_STRUCT = None;
        }
    }
}

#[tauri::command(async)]
fn log_in_again(ip: String, password: String) -> bool {
    let tcp = std::net::TcpStream::connect(format!("{}:22", ip)).unwrap();
    tcp.set_read_timeout(Some(std::time::Duration::from_secs(1)))
        .unwrap();
    let mut sess = Session::new().unwrap();
    sess.set_tcp_stream(tcp);
    sess.handshake().unwrap();
    let res = sess.userauth_password("root", &password);
    res.is_ok()
}

#[tauri::command(async)]
fn cpu_mem_sync_stop() {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_mut() } {
        my_boxed_session.stop_cpu_mem_sync = true;
    }
}

#[tauri::command(async)]
async fn cpu_mem_sync(window: tauri::Window) {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_mut() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel.exec(&*format!("
                export PATH=$PATH:/usr/local/go/bin:/root/go/bin;
                while true; 
                    do
                        cpu_mem=\"$(top -b -n1 | awk '/Cpu\\(s\\)/{{print \"CPU:\" 100-$8}} /MiB Mem/{{print \"MEM:\"($4-$6)/$4*100}}')\"; 
                        service_status=\"$(systemctl is-active $(bash -c -l 'echo -n $EXECUTE') 2>/dev/null)\";
                        sync_status=\"$($(bash -c -l 'echo -n $EXECUTE') status 2>&1 | jq -r '\"HEIGHT:\\(.SyncInfo.latest_block_height)\", \"CATCHUP:\\(.SyncInfo.catching_up)\"' 2>/dev/null)\";
                        version=\"$($(bash -c -l 'echo -n $EXECUTE') version 2>&1)\";
                        echo -n \"$cpu_mem\nSTATUS:$service_status\n$sync_status\nVERSION:$version\n\";
                        sleep 1; echo ''; sleep 1; echo ''; sleep 1; echo ''; sleep 1; echo ''; sleep 1;
                    done
            ")).unwrap();
        my_boxed_session.stop_cpu_mem_sync = false;
        loop {
            if my_boxed_session.stop_cpu_mem_sync {
                channel.close().unwrap();
                return;
            }
            let mut buf = [0u8; 1024];
            let len = channel.read(&mut buf).unwrap();
            let s = std::str::from_utf8(&buf[0..len]).unwrap();
            if s != "\n" {
                let _ = window
                    .emit(
                        "cpu_mem_sync",
                        serde_json::json!({
                            "status": get_capture(s, r"STATUS:(\w+)"),
                            "cpu": get_capture(s, r"CPU:(\w+)"),
                            "mem": get_capture(s, r"MEM:(\w+)"),
                            "height": get_capture(s, r"HEIGHT:(\w+)"),
                            "catchup": get_capture(s, r"CATCHUP:(\w+)"),
                            "version": get_capture(s, r"VERSION:(.*)")
                        }),
                    )
                    .unwrap();
            }
        }
    }
}
fn get_capture(s: &str, regex_str: &str) -> String {
    regex::Regex::new(regex_str)
        .unwrap()
        .captures(s)
        .map(|captures| captures.get(1).map(|m| m.as_str()).unwrap_or(""))
        .unwrap_or("")
        .to_string()
}

#[tauri::command(async)]
fn node_info() -> String {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel
                .exec(&format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; $(bash -c -l 'echo $EXECUTE') status 2>&1 | jq"))
                .unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
        s
    } else {
        "".to_string()
    }
}

#[tauri::command(async)]
fn delete_node() {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel
                .exec(&format!(
                    "bash -c -l \"sudo systemctl stop $EXECUTE; sudo systemctl disable $EXECUTE; sudo rm -rf /etc/systemd/system/$EXECUTE* $(which $EXECUTE) $HOME/$SYSTEM_FOLDER* $HOME/$SYSTEM_FILE* $HOME/$EXECUTE*; sed -i '/EXECUTE/d; /CHAIN_ID/d; /PORT/d; /DENOM/d; /SEEDS/d; /PEERS/d; /VERSION/d; /SYSTEM_FOLDER/d; /PROJECT_FOLDER/d; /GO_VERSION/d; /GENESIS_FILE/d; /ADDRBOOK/d; /MIN_GAS/d; /SEED_MODE/d; /PATH/d; /REPO/d; /MONIKER/d; /SNAPSHOT_URL/d; /WALLET_NAME/d' ~/.bash_profile; source .bash_profile; unset EXECUTE CHAIN_ID PORT DENOM SEEDS PEERS VERSION SYSTEM_FOLDER PROJECT_FOLDER GO_VERSION GENESIS_FILE ADDRBOOK MIN_GAS SEED_MODE PATH REPO MONIKER SNAPSHOT_URL WALLET_NAME\""
                ))
                .unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
    }
}

#[tauri::command(async)]
fn install_node(identifier: String, window: tauri::Window) {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        println!("{}", identifier);
        channel.exec(&format!("echo 'export MONIKER=node101' >> $HOME/.bash_profile; echo 'export WALLET_NAME=node101' >> $HOME/.bash_profile; wget -O band.sh https://node101.io/mainnet/bandprotocol/band.sh && chmod +x band.sh && ./band.sh")).unwrap();
        // channel.exec(&format!("echo 'export MONIKER=node101' >> $HOME/.bash_profile; echo 'export WALLET_NAME=node101' >> $HOME/.bash_profile; wget -O {identifier}.sh https://node101.io/testnet/{identifier}/{identifier}.sh && chmod +x {identifier}.sh && ./{identifier}.sh")).unwrap();
        loop {
            let mut buf = [0u8; 1024];
            let len = channel.read(&mut buf).unwrap();
            if len == 0 {
                break;
            }
            let s = std::str::from_utf8(&buf[0..len]).unwrap();
            println!("{}", s);
            if s.contains("SETUP IS FINISHED") {
                window.eval("endInstallation();").unwrap();
                break;
            }
            std::io::stdout().flush().unwrap();
        }
        channel.close().unwrap();
    }
}

#[tauri::command(async)]
fn if_password_required() -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel
            .exec(&format!(
                "yes | bash -c -l '$EXECUTE keys add testifpasswordneeded --output json'"
            ))
            .unwrap();
        let mut buf = [0u8; 1024];
        channel.read(&mut buf).unwrap();
        let s = std::str::from_utf8(&buf[9..29]).unwrap();
        if s == "testifpasswordneeded" {
            channel.close().unwrap();
            delete_wallet("testifpasswordneeded".to_string());
            false
        } else {
            channel.close().unwrap();
            true
        }
    } else {
        println!("error in if_password_required");
        true
    }
}

#[tauri::command(async)]
fn if_keyring_exist() -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel
            .exec(&format!(
                "bash -c -l 'test -e $HOME/$SYSTEM_FOLDER/keyhash && echo yes || echo no'"
            ))
            .unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        channel.close().unwrap();
        s.contains("yes")
    } else {
        println!("error in if_keyring_exist");
        true
    }
}

#[tauri::command(async)]
fn create_keyring(passphrase: String) {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel
                .exec(&*format!(
                    "echo -e '{passphrase}\n{passphrase}\n' | bash -c -l '$EXECUTE keys add forkeyringpurpose --output json'; yes \"{passphrase}\" | bash -c -l '$EXECUTE keys delete forkeyringpurpose -y --output json'"))
                .unwrap();
        channel.close().unwrap();
    }
}

#[tauri::command(async)]
fn delete_keyring() {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel
            .exec(&*format!(
                "bash -c -l 'cd $HOME/$SYSTEM_FOLDER; rm -rf keyhash *.address *.info;'"
            ))
            .unwrap();
        channel.close().unwrap();
    }
}

#[tauri::command(async)]
fn check_keyring_passphrase(passw: String) -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_mut() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel
                .exec(&*format!(
                    "echo -e '{}\ny\n' | bash -c -l '$EXECUTE keys add testifpasswordcorrect --output json'",
                    passw
                ))
                .unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        if s.contains("address") {
            my_boxed_session.walletpassword = passw.to_string();
            channel.close().unwrap();
            delete_wallet("testifpasswordcorrect".to_string());
            true
        } else {
            channel.close().unwrap();
            false
        }
    } else {
        println!("error in check_keyring_passphrase");
        false
    }
}

#[tauri::command(async)]
fn create_wallet(walletname: String) -> String {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let mut s = String::new();
        channel
            .exec(&*format!(
                "echo -e '{}\ny\n' | bash -c -l '$EXECUTE keys add {} --output json'",
                my_boxed_session.walletpassword, walletname
            ))
            .unwrap();
        channel.read_to_string(&mut s).unwrap();
        channel.close().unwrap();
        s
    } else {
        println!("error in create_wallet");
        "".to_string()
    }
}

#[tauri::command(async)]
fn if_wallet_exists(walletname: String) -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let command: String = format!(
            "echo -e {} | bash -c -l '$EXECUTE keys list --output json'",
            my_boxed_session.walletpassword,
        );
        channel.exec(&*command).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        let v: Value = serde_json::from_str(&s).unwrap();
        let mut is_exist = false;
        for i in v.as_array().unwrap() {
            if i["name"].to_string() == format!("\"{}\"", walletname) {
                is_exist = true;
            }
        }
        channel.close().unwrap();
        is_exist
    } else {
        false
    }
}

#[tauri::command(async)]
fn show_wallets() -> String {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let command: String = format!(
                "yes \"{}\" | bash -c -l 'echo -n \"[\"; first=true; $EXECUTE keys list --output json | jq -c \".[]\" | while read -r line; do address=$(echo $line | jq -r \".address\"); balances=$($EXECUTE query bank balances $address --output json); if [ $first = true ]; then echo -n \"{{\\\"name\\\": \\\"$(echo $line | jq -r \".name\")\\\", \\\"address\\\": \\\"$address\\\", \\\"balance\\\": $balances, \\\"denom\\\": \\\"$DENOM\\\"}}\"; first=false; else echo -n \",{{\\\"name\\\": \\\"$(echo $line | jq -r \".name\")\\\", \\\"address\\\": \\\"$address\\\", \\\"balance\\\": $balances}}\"; fi; done; echo \"]\"'",
                my_boxed_session.walletpassword,
            );
        channel.exec(&*command).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        channel.close().unwrap();
        s
    } else {
        println!("error in show_wallets");
        String::new()
    }
}

#[tauri::command(async)]
fn delete_wallet(walletname: String) -> () {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let command: String = format!(
            "yes \"{}\" | bash -c -l '$EXECUTE keys delete {} -y --output json'",
            my_boxed_session.walletpassword, walletname
        );
        channel.exec(&*command).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
    }
}

#[tauri::command(async)]
fn start_stop_restart_node(action: String) {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let command: String = format!("bash -c -l 'systemctl {} $EXECUTE'", action);
        channel.exec(&*command).unwrap();
        channel.close().unwrap();
    }
}

#[tauri::command(async)]
fn recover_wallet(walletname: String, mnemo: String, passwordneed: bool) {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let mut s = String::new();
        channel
            .exec(&*format!(
                "echo -e '{}\n{}' | bash -c -l '$EXECUTE keys add {} --recover --output json'",
                mnemo,
                if passwordneed {
                    my_boxed_session.walletpassword.to_string() + "\n"
                } else {
                    String::new()
                },
                walletname
            ))
            .unwrap();
        channel.read_to_string(&mut s).unwrap();
        println!("Recovered: {}", s);
        channel.close().unwrap();
    }
}

#[tauri::command(async)]
fn validator_list() -> String {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel.exec(&*format!(
            "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; $(bash -c -l 'echo $EXECUTE') query staking validators --limit 2000 -o json | jq -r '.validators[] | select(.status==\"BOND_STATUS_BONDED\") | {{ validator: .description.moniker, voting_power: (.tokens | tonumber / pow(10; 6)), commission: (100 * (.commission.commission_rates.rate | tonumber)), valoper: .operator_address }}' | jq -s"
        )).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        channel.close().unwrap();
        s
    } else {
        println!("error in validator_list");
        String::new()
    }
}

// BELOW IS NOT TESTED YET
#[tauri::command(async)]
fn update_node(current_version: String) {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        println!("{}", current_version);
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let mut repo = String::new();
        channel
            .exec(&format!("grep 'REPO=' .bash_profile | sed 's/^.*: //"))
            .unwrap();
        channel.read_to_string(&mut repo).unwrap();
        channel.close().unwrap();
        println!("{}", repo);
    }
}

#[tauri::command(async)]
fn delegate_token(
    wallet_name: String,
    validator_valoper: String,
    amount: String,
    fees: String,
) -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel.exec(&format!(
            "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | bash -c -l '$EXECUTE tx staking delegate {validator_valoper} {amount}$DENOM --from={wallet_name} --fees={fees}$DENOM --chain-id=$CHAIN_ID --gas=auto'",
            password = my_boxed_session.walletpassword,
        )).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
        true
    } else {
        println!("error in delegate_token");
        false
    }
}

#[tauri::command(async)]
fn redelegate_token(
    wallet_name: String,
    destination_validator: String,
    fees: String,
    amount: String,
    first_validator: String,
) -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let command: String = format!(
            "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" |  bash -c -l '$EXECUTE tx staking rewdelegate {first_validator} {destination_validator} {amount}$DENOM --from={wallet_name} --fees={fees}$DENOM --chain-id=$CHAIN_ID --gas=auto'",
            password = my_boxed_session.walletpassword,
        );
        channel.exec(&*command).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
        true
    } else {
        println!("error in redelegate_token");
        false
    }
}

#[tauri::command(async)]
fn vote(wallet_name: String, proposal_number: String, selected_option: String) -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel.exec(&*format!(
            "yes '{password}' | bash -c -l '$EXECUTE tx gov vote {proposal_number} {selected_option} --from {wallet_name} --chain-id=$CHAIN_ID -y'",
            password = my_boxed_session.walletpassword
        )).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
        true
    } else {
        println!("error in vote");
        false
    }
}

#[tauri::command(async)]
fn send_token(
    wallet_name: String,
    receiver_address: String,
    amount: String,
    fees: String,
) -> (bool, String) {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        channel.exec(&*format!(
            "yes '{password}' | bash -c -l '$EXECUTE tx bank send {wallet_name} {receiver_address} {amount}$DENOM -y --fees={fees}$DENOM --output json'",
            password = my_boxed_session.walletpassword
        )).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
        (true, s)
    } else {
        println!("error in send_token");
        (false, String::new())
    }
}

#[tauri::command(async)]
fn unjail(wallet_name: String, fees: String) -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let command: String = format!(
            "yes \"{password}\" | bash -c -l '$EXECUTE tx slashing unjail --from={wallet_name} --chain-id=$CHAIN_ID --gas=auto --fees{fees}$DENOM -y'",
            password = my_boxed_session.walletpassword,
        );
        channel.exec(&command).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
        true
    } else {
        println!("error in unjail");
        false
    }
}

#[tauri::command(async)]
fn create_validator(
    website: String,
    amount: String,
    wallet_name: String,
    com_rate: String,
    moniker_name: String,
    keybase_id: String,
    contact: String,
    fees: String,
    details: String,
    project_name: String,
) -> (bool, String) {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let mut s = String::new();
        channel.exec(&format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | bash -c -l '$EXECUTE tx {operation} create-validator -y \
                --output json \
                --pubkey=$($EXECUTE tendermint show-validator) \
                --amount={amount}$DENOM \
                --from={wallet_name} \
                --moniker={moniker_name} \
                --website={website} \
                --identity={keybase_id} \
                --security-contact={contact} \
                --commission-rate={com_rate} \
                --commission-max-rate=0.20 \
                --commission-max-change-rate=0.01 \
                --fees={fees}$DENOM \
                --min-self-delegation=1 \
                --details={details}'",
                password = my_boxed_session.walletpassword,
                operation = if project_name == "Babylon" { "checkpointing" } else { "staking" }
            )).unwrap();
        channel.read_to_string(&mut s).unwrap();
        channel.close().unwrap();
        (true, s)
    } else {
        (false, String::new())
    }
}

#[tauri::command(async)]
fn edit_validator(
    amount: String,
    wallet_name: String,
    website: String,
    contact: String,
    keybase_id: String,
    com_rate: String,
    details: String,
) -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        let mut s = String::new();
        channel.exec(&format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | bash -c -l \"$EXECUTE tx staking edit-validator \
                --amount={amount}$DENOM \
                --from={wallet_name} \
                --website={website} \
                --security-contact={contact} \
                --identity={keybase_id} \
                --commission-rate={com_rate} \
                --details={details}\"",
                password = my_boxed_session.walletpassword,
            )).unwrap();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
        true
    } else {
        false
    }
}

#[tauri::command(async)]
fn withdraw_rewards(valoper_address: String, wallet_name: String) -> bool {
    if let Some(my_boxed_session) = unsafe { GLOBAL_STRUCT.as_ref() } {
        let mut channel = my_boxed_session.open_session.channel_session().unwrap();
        // $EXECUTE tx distribution withdraw-rewards $VALOPER_ADDRESS --from=$WALLET_NAME --commission --chain-id=$CHAIN_ID
        channel.exec(&format!(
            "yes '{password}' | bash -c -l '$EXECUTE tx distribution withdraw-rewards {valoper_address} --from={wallet_name} --commission --chain-id=$CHAIN_ID'",
            password = my_boxed_session.walletpassword,
        )).unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        println!("{}", s);
        channel.close().unwrap();
        true
    } else {
        println!("error in withdraw_rewards");
        false
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app.get_window("main")
                .unwrap()
                .set_min_size(Some(LogicalSize::new(1280, 720)))
                .unwrap();
            app.get_window("main").unwrap().center().unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            log_in,
            log_in_again,
            log_out,
            cpu_mem_sync,
            cpu_mem_sync_stop,
            node_info,
            install_node,
            unjail,
            create_wallet,
            show_wallets,
            delete_wallet,
            start_stop_restart_node,
            delete_node,
            update_node,
            send_token,
            recover_wallet,
            vote,
            edit_validator,
            withdraw_rewards,
            if_wallet_exists,
            if_password_required,
            if_keyring_exist,
            create_keyring,
            delete_keyring,
            check_keyring_passphrase,
            create_validator,
            delegate_token,
            redelegate_token,
            validator_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
