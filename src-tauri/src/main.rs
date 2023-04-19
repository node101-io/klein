#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde_json::{self, Value};
use ssh2::{DisconnectCode, Session};
use std::{
    io::{prelude::Read, Write},
    net::TcpStream,
    time::Duration,
};
use tauri::{regex, LogicalSize, Manager};

struct SessionManager {
    open_session: Session,
    stop_cpu_mem_sync: bool,
    walletpassword: String,
}
static mut GLOBAL_STRUCT: Option<SessionManager> = None;

#[tauri::command(async)]
fn log_in(ip: String, password: String) -> Result<String, String> {
    let tcp = TcpStream::connect(format!("{ip}:22")).map_err(|e| e.to_string())?;
    tcp.set_read_timeout(Some(Duration::from_secs(1)))
        .map_err(|e| e.to_string())?;
    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| e.to_string())?;
    sess.userauth_password("root", &password)
        .map_err(|_e| "Authentication failed!".to_string())?;
    unsafe {
        GLOBAL_STRUCT = Some(SessionManager {
            open_session: sess,
            stop_cpu_mem_sync: false,
            walletpassword: String::new(),
        });
    }
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel
        .exec("bash -c -l 'echo $EXECUTE'")
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s.trim().to_string())
}

#[tauri::command(async)]
fn log_out() -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    (*my_boxed_session)
        .open_session
        .disconnect(
            Some(DisconnectCode::AuthCancelledByUser),
            "Disconnecting from server",
            None,
        )
        .map_err(|e| e.to_string())?;
    unsafe {
        GLOBAL_STRUCT = None;
    }
    Ok(())
}

#[tauri::command(async)]
fn log_in_again(ip: String, password: String) -> Result<(), String> {
    let tcp = TcpStream::connect(format!("{ip}:22")).map_err(|e| e.to_string())?;
    tcp.set_read_timeout(Some(Duration::from_secs(1)))
        .map_err(|e| e.to_string())?;
    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| e.to_string())?;
    sess.userauth_password("root", &password)
        .map_err(|_e| "Authentication failed!".to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn cpu_mem_sync_stop() -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    my_boxed_session.stop_cpu_mem_sync = true;
    std::thread::sleep(std::time::Duration::from_secs(1));
    Ok(())
}

#[tauri::command(async)]
async fn cpu_mem_sync(window: tauri::Window) {
    let my_boxed_session = unsafe { GLOBAL_STRUCT.as_mut() }.unwrap();
    let mut channel = my_boxed_session.open_session.channel_session().unwrap();
    channel.exec(&*format!(r#"
            bash -c -l 'while true; do
                cpu_mem="$(top -b -n1 | awk '\''/Cpu\(s\)/{{print "CPU:" 100-$8}} /MiB Mem/{{print "MEM:"($4-$6)/$4*100}}'\'')";
                service_status="$(systemctl is-active $EXECUTE 2>/dev/null)";
                sync_status="$($EXECUTE status 2>&1 | jq -r "\"HEIGHT:\\(.SyncInfo.latest_block_height)\", \"CATCHUP:\\(.SyncInfo.catching_up)\"" 2>/dev/null)";
                version="$($EXECUTE version 2>&1)";
                echo -n "$cpu_mem\nSTATUS:$service_status\n$sync_status\nVERSION:$version";
                sleep 1; echo ""; sleep 1; echo ""; sleep 1; echo ""; sleep 1; echo ""; sleep 1;
            done'"#
        )).unwrap();
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
fn get_capture(s: &str, regex_str: &str) -> String {
    regex::Regex::new(regex_str)
        .unwrap()
        .captures(s)
        .map(|captures| captures.get(1).map(|m| m.as_str()).unwrap_or(""))
        .unwrap_or("")
        .to_string()
}

#[tauri::command(async)]
fn node_info() -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel
        .exec(&format!("bash -c -l '$EXECUTE status 2>&1 | jq'"))
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    if s.is_empty() {
        return Err("Your node is not running.".to_string());
    }
    Ok(s)
}

#[tauri::command(async)]
fn delete_node() -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel
        .exec(
            "bash -c -l \"sudo systemctl stop $EXECUTE; sudo systemctl disable $EXECUTE; sudo rm -rf /etc/systemd/system/$EXECUTE* $(which $EXECUTE) $HOME/$SYSTEM_FOLDER* $HOME/$SYSTEM_FILE* $HOME/$EXECUTE*; sed -i '/EXECUTE/d; /CHAIN_ID/d; /PORT/d; /DENOM/d; /SEEDS/d; /PEERS/d; /VERSION/d; /SYSTEM_FOLDER/d; /PROJECT_FOLDER/d; /GO_VERSION/d; /GENESIS_FILE/d; /ADDRBOOK/d; /MIN_GAS/d; /SEED_MODE/d; /PATH/d; /REPO/d; /MONIKER/d; /SNAPSHOT_URL/d; /WALLET_NAME/d' ~/.bash_profile; source .bash_profile; unset EXECUTE CHAIN_ID PORT DENOM SEEDS PEERS VERSION SYSTEM_FOLDER PROJECT_FOLDER GO_VERSION GENESIS_FILE ADDRBOOK MIN_GAS SEED_MODE PATH REPO MONIKER SNAPSHOT_URL WALLET_NAME\""
        )
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn install_node(network: String, identifier: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    println!("{}", identifier);
    channel.exec(&format!(
        "echo 'export MONIKER=node101' >> $HOME/.bash_profile; echo 'export WALLET_NAME=node101' >> $HOME/.bash_profile; \
        wget -O {identifier}.sh https://node101.io/{network}/{identifier}.sh && chmod +x {identifier}.sh && ./{identifier}.sh"
    )).map_err(|e| e.to_string())?;
    loop {
        let mut buf = [0u8; 1024];
        let len = channel.read(&mut buf).map_err(|e| e.to_string())?;
        if len == 0 {
            channel.close().map_err(|e| e.to_string())?;
            break;
        }
        let s = std::str::from_utf8(&buf[0..len]).map_err(|e| e.to_string())?;
        println!("{}", s);
        if s.contains("SETUP IS FINISHED") {
            channel.close().map_err(|e| e.to_string())?;
            return Ok(());
        }
        std::io::stdout().flush().map_err(|e| e.to_string())?;
    }
    Err("Something went wrong.".to_string())
}

#[tauri::command(async)]
fn password_keyring_check() -> Result<(bool, bool), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(
        "bash -c -l 'yes | $EXECUTE keys add forkeyingpurpose --output json 2>/dev/null; \
        yes | $EXECUTE keys list --output json 2>/dev/null; \
        test -e $HOME/$SYSTEM_FOLDER/keyhash && echo password_does_exist || echo password_doesnt_exist'"
    ).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok((!s.starts_with("{"), s.contains("password_does_exist")))
}

#[tauri::command(async)]
fn create_keyring(passphrase: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&*format!(
        "echo -e '{passphrase}\n{passphrase}\n' | bash -c -l '$EXECUTE keys add forkeyringpurpose --output json'"
    )).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn delete_keyring() -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel
        .exec("bash -c -l 'cd $HOME/$SYSTEM_FOLDER; rm -rf keyhash *.address *.info;'")
        .map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn check_keyring_passphrase(passw: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel
        .exec(&*format!(
            "echo -e '{passw}\ny\n' | bash -c -l '$EXECUTE keys add testifpasswordcorrect --output json'"
        ))
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    if s.contains("address") {
        my_boxed_session.walletpassword = passw.to_string();
        channel.close().map_err(|e| e.to_string())?;
        delete_wallet("testifpasswordcorrect".to_string())?;
        Ok(())
    } else {
        channel.close().map_err(|e| e.to_string())?;
        Err("Wrong password.".to_string())
    }
}

#[tauri::command(async)]
fn create_wallet(walletname: String) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel
        .exec(&*format!(
            "echo -e '{}\ny\n' | bash -c -l '$EXECUTE keys add {} --output json'",
            my_boxed_session.walletpassword, walletname
        ))
        .map_err(|e| e.to_string())?;
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn if_wallet_exists(walletname: String) -> Result<bool, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command: String = format!(
        "echo -e {} | bash -c -l '$EXECUTE keys list --output json'",
        my_boxed_session.walletpassword,
    );
    channel.exec(&*command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    let v: Value = serde_json::from_str(&s).map_err(|e| e.to_string())?;
    let mut is_exist = false;
    for i in v.as_array().unwrap() {
        if i["name"].to_string() == format!("\"{}\"", walletname) {
            is_exist = true;
        }
    }
    channel.close().map_err(|e| e.to_string())?;
    Ok(is_exist)
}

#[tauri::command(async)]
fn show_wallets() -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command: String = format!(
        "yes \"{}\" | bash -c -l 'echo -n \"[\"; first=true; $EXECUTE keys list --output json | jq -c \".[]\" | while read -r line; do address=$(echo $line | jq -r \".address\"); balances=$($EXECUTE query bank balances $address --output json); if [ $first = true ]; then echo -n \"{{\\\"name\\\": \\\"$(echo $line | jq -r \".name\")\\\", \\\"address\\\": \\\"$address\\\", \\\"balance\\\": $balances, \\\"denom\\\": \\\"$DENOM\\\"}}\"; first=false; else echo -n \",{{\\\"name\\\": \\\"$(echo $line | jq -r \".name\")\\\", \\\"address\\\": \\\"$address\\\", \\\"balance\\\": $balances}}\"; fi; done; echo \"]\"'",
        my_boxed_session.walletpassword,
    );
    channel.exec(&*command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn delete_wallet(walletname: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command: String = format!(
        "yes \"{}\" | bash -c -l '$EXECUTE keys delete {} -y --output json'",
        my_boxed_session.walletpassword, walletname
    );
    channel.exec(&*command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn start_stop_restart_node(action: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command: String = format!("bash -c -l 'systemctl {} $EXECUTE'", action);
    channel.exec(&*command).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn recover_wallet(walletname: String, mnemo: String, passwordneed: bool) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
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
        .map_err(|e| e.to_string())?;
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn validator_list() -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&*format!(r#"bash -c -l '$EXECUTE query staking validators --limit 2000 -o json | jq -r ".validators[] | select(.status==\"BOND_STATUS_BONDED\") | {{ validator: .description.moniker, voting_power: (.tokens | tonumber / pow(10; 6)), commission: (100 * (.commission.commission_rates.rate | tonumber)), valoper: .operator_address }}" | jq -s'"#)).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

// BELOW IS NOT FULLY TESTED YET
#[tauri::command(async)]
fn update_node(latest_version: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel
        .exec(&*format!(
            "bash -c -l 'systemctl stop $EXECUTE; \
            git pull; \
            git checkout {latest_version}; \
            make install; \
            systemctl restart $EXECUTE'"
        ))
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("Updated: {}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn delegate_token(
    wallet_name: String,
    validator_valoper: String,
    amount: String,
    fees: String,
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx staking delegate {validator_valoper} {amount}$DENOM --from={wallet_name} --fees={fees}$DENOM --chain-id=$CHAIN_ID --gas=auto'",
        password = my_boxed_session.walletpassword,
    )).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn redelegate_token(
    wallet_name: String,
    destination_validator: String,
    fees: String,
    amount: String,
    first_validator: String,
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&*format!(
        "yes '{password}' |  bash -c -l '$EXECUTE tx staking redelegate {first_validator} {destination_validator} {amount}$DENOM --from={wallet_name} --fees={fees}$DENOM --chain-id=$CHAIN_ID --gas=auto'",
        password = my_boxed_session.walletpassword,
    )).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn vote(
    wallet_name: String,
    proposal_number: String,
    selected_option: String,
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&*format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx gov vote {proposal_number} {selected_option} --from {wallet_name} --chain-id=$CHAIN_ID -y'",
        password = my_boxed_session.walletpassword
    )).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn send_token(
    wallet_name: String,
    receiver_address: String,
    amount: String,
    fees: String,
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&*format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx bank send {wallet_name} {receiver_address} {amount}$DENOM -y --fees={fees}$DENOM --output json'",
        password = my_boxed_session.walletpassword
    )).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn unjail(wallet_name: String, fees: String) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx slashing unjail --from={wallet_name} --chain-id=$CHAIN_ID --gas=auto --fees{fees}$DENOM -y'",
        password = my_boxed_session.walletpassword,
    )).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
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
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel
        .exec(&format!(
            "yes '{password}' | bash -c -l '$EXECUTE tx {operation} create-validator -y \
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
            operation = if project_name == "Babylon" {
                "checkpointing"
            } else {
                "staking"
            }
        ))
        .map_err(|e| e.to_string())?;
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
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
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel
        .exec(&format!(
            "yes '{password}' | bash -c -l '$EXECUTE tx staking edit-validator \
                --output json
                --amount={amount}$DENOM \
                --from={wallet_name} \
                --website={website} \
                --security-contact={contact} \
                --identity={keybase_id} \
                --commission-rate={com_rate} \
                --details={details}'",
            password = my_boxed_session.walletpassword,
        ))
        .map_err(|e| e.to_string())?;
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn withdraw_rewards(valoper_address: String, wallet_name: String) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    // $EXECUTE tx distribution withdraw-rewards $VALOPER_ADDRESS --from=$WALLET_NAME --commission --chain-id=$CHAIN_ID
    channel.exec(&format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx distribution withdraw-rewards {valoper_address} --from={wallet_name} --commission --chain-id=$CHAIN_ID'",
        password = my_boxed_session.walletpassword,
    )).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
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
            password_keyring_check,
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
