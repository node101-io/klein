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
use tauri::{LogicalSize, Manager, Window};

struct SessionManager {
    open_session: Session,
    stop_cpu_mem_sync: bool,
    walletpassword: String,
}
static mut GLOBAL_STRUCT: Option<SessionManager> = None;

// SSH FUNCTIONS
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

// CPU, MEM, SYNC, VERSION FUNCTIONS
#[tauri::command(async)]
fn cpu_mem_sync(window: Window, exception: String) {
    let my_boxed_session = unsafe { GLOBAL_STRUCT.as_mut() }.unwrap();
    let mut channel = my_boxed_session.open_session.channel_session().unwrap();
    let (status_command, height_command, catchup_command, version_command) = match exception.as_str() {
        "celestia-lightd" | "celestia-bridge" => (
            format!("$(systemctl is-active {exception}.service 2>/dev/null)"),
            "$(curl -sX GET http://127.0.0.1:26659/head | jq -r .header.height 2>/dev/null)",
            "$(echo $(if [ $((10#$(curl -sX GET https://rpc-blockspacerace.pops.one/block | jq -r .result.block.header.height) > 10#$(curl -sX GET http://127.0.0.1:26659/head | jq -r .header.height))) -eq 1 ]; then echo true; else echo false; fi) 2>/dev/null)",
            r#"$(celestia version | grep -oP "Semantic version: \K[^ ]+" 2>/dev/null)"#,
        ),
        _ => (
            "$(systemctl is-active $EXECUTE 2>/dev/null)".to_string(),
            r#"$($EXECUTE status 2>&1 | jq -r \""\(.SyncInfo.latest_block_height)"\" 2>/dev/null)"#,
            r#"$($EXECUTE status 2>&1 | jq -r \""\(.SyncInfo.catching_up)"\" 2>/dev/null)"#,
            r#"$($EXECUTE version 2>&1 2>/dev/null)"#,
        ),
    };
    channel
        .exec(&*format!(
            r#"bash -c -l 'while true; do
            echo -n "{{ \"cpu\": \"$(top -b -n1 | awk '\''/Cpu\(s\)/{{print 100-$8}}'\'' 2>/dev/null)\", \"mem\": \"$(top -b -n1 | awk '\''/MiB Mem/{{print ($4-$6)/$4*100}}'\'' 2>/dev/null)\", \"status\": \"{status_command}\", \"height\": \"{height_command}\", \"catchup\": \"{catchup_command}\", \"version\": \"{version_command}\" }}";
            sleep 1; echo ""; sleep 1; echo ""; sleep 1; echo ""; sleep 1; echo ""; sleep 1; done'"#
        ))
        .unwrap();

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
            let _ = window.emit("cpu_mem_sync", s.to_string()).unwrap();
        }
    }
}

#[tauri::command(async)]
fn cpu_mem_sync_stop() -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    my_boxed_session.stop_cpu_mem_sync = true;
    std::thread::sleep(std::time::Duration::from_secs(1));
    Ok(())
}

// NODE FUNCTIONS
#[tauri::command(async)]
fn install_node(network: String, identifier: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
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
fn delete_node(exception: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = match exception.as_str() {
        "celestia-lightd" | "celestia-bridge" => format!(
            r#"bash -c -l "sudo systemctl stop $EXECUTE; sudo systemctl disable $EXECUTE; sudo rm -rf /etc/systemd/system/$EXECUTE* $(which celestia) $(which celestia-appd) $HOME/$SYSTEM_FOLDER* $HOME/$SYSTEM_FILE* $HOME/$EXECUTE*; sed -i '/EXECUTE/d; /CHAIN_ID/d; /PORT/d; /DENOM/d; /SEEDS/d; /PEERS/d; /VERSION/d; /SYSTEM_FOLDER/d; /PROJECT_FOLDER/d; /GO_VERSION/d; /GENESIS_FILE/d; /ADDRBOOK/d; /MIN_GAS/d; /SEED_MODE/d; /PATH/d; /REPO/d; /MONIKER/d; /SNAPSHOT_URL/d; /WALLET_NAME/d' ~/.bash_profile; source ~/.bash_profile; unset EXECUTE CHAIN_ID PORT DENOM SEEDS PEERS VERSION SYSTEM_FOLDER PROJECT_FOLDER GO_VERSION GENESIS_FILE ADDRBOOK MIN_GAS SEED_MODE PATH REPO MONIKER SNAPSHOT_URL WALLET_NAME""#
        ),
        _ => format!(
            r#"bash -c -l "sudo systemctl stop $EXECUTE; sudo systemctl disable $EXECUTE; sudo rm -rf /etc/systemd/system/$EXECUTE* $(which $EXECUTE) $HOME/$SYSTEM_FOLDER* $HOME/$SYSTEM_FILE* $HOME/$EXECUTE*; sed -i '/EXECUTE/d; /CHAIN_ID/d; /PORT/d; /DENOM/d; /SEEDS/d; /PEERS/d; /VERSION/d; /SYSTEM_FOLDER/d; /PROJECT_FOLDER/d; /GO_VERSION/d; /GENESIS_FILE/d; /ADDRBOOK/d; /MIN_GAS/d; /SEED_MODE/d; /PATH/d; /REPO/d; /MONIKER/d; /SNAPSHOT_URL/d; /WALLET_NAME/d' ~/.bash_profile; source ~/.bash_profile; unset EXECUTE CHAIN_ID PORT DENOM SEEDS PEERS VERSION SYSTEM_FOLDER PROJECT_FOLDER GO_VERSION GENESIS_FILE ADDRBOOK MIN_GAS SEED_MODE PATH REPO MONIKER SNAPSHOT_URL WALLET_NAME""#
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

// KEYRING FUNCTIONS
#[tauri::command(async)]
fn password_keyring_check() -> Result<(bool, bool), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(
        "bash -c -l 'yes | $EXECUTE keys add forkeyringpurpose --output json 2>/dev/null; \
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
fn check_keyring_passphrase(passw: String, exception: String) -> Result<(), String> {
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
        delete_wallet("testifpasswordcorrect".to_string(), exception)?;
        Ok(())
    } else {
        channel.close().map_err(|e| e.to_string())?;
        Err("Wrong password.".to_string())
    }
}

// WALLET FUNCTIONS
#[tauri::command(async)]
fn create_wallet(walletname: String, exception: String) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    let command = match exception.as_str() {
        "celestia-lightd" | "celestia-bridge" => format!(
            r#"bash -c -l 'celestia-node/cel-key add {walletname} --node.type light --p2p.network blockspacerace --output json 2>&1 | awk "NR > 1" | jq -r .mnemonic'"#
        ),
        _ => format!(
            r#"echo -e '{}\ny\n' | bash -c -l '$EXECUTE keys add {} --output json | jq -r .mnemonic'"#,
            my_boxed_session.walletpassword, walletname
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn if_wallet_exists(walletname: String, exception: String) -> Result<bool, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = match exception.as_str() {
        "celestia-lightd" | "celestia-bridge" => format!(
            r#"echo -e {} | bash -c -l 'celestia-node/cel-key list --node.type light --p2p.network blockspacerace --output json | awk "NR > 1"'"#,
            my_boxed_session.walletpassword
        ),
        _ => format!(
            "echo -e {} | bash -c -l '$EXECUTE keys list --output json'",
            my_boxed_session.walletpassword
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
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
fn show_wallets(exception: String) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = match exception.as_str() {
        "celestia-lightd" | "celestia-bridge" => {
            format!(
                r#"bash -c -l 'echo -n "["; first=true; celestia-node/cel-key list --node.type light --p2p.network blockspacerace --output json | awk "NR > 1" | jq -c ".[]" | while read -r line; do address=$(echo $line | jq -r ".address"); balances=$(curl -sX GET http://localhost:26659/balance/$address); if [ $first = true ]; then echo -n "{{\"name\": \"$(echo $line | jq -r ".name")\", \"address\": \"$address\", \"balance\": {{ \"balances\": [ $balances ] }}, \"denom\": \"$DENOM\"}}"; first=false; else echo -n ",{{\"name\": \"$(echo $line | jq -r ".name")\", \"address\": \"$address\", \"balance\": {{ \"balances\": [ $balances ] }}}}"; fi; done; echo "]"' | jq"#,
            )
        }
        _ => format!(
            r#"yes '{}' | bash -c -l 'echo -n "["; first=true; $EXECUTE keys list --output json | jq -c ".[]" | while read -r line; do address=$(echo $line | jq -r ".address"); balances=$($EXECUTE query bank balances $address --output json); if [ $first = true ]; then echo -n " {{ \"name\": \"$(echo $line | jq -r .name)\", \"address\": \"$address\", \"balance\": $balances, \"denom\": \"$DENOM\" }} "; first=false; else echo -n ", {{ \"name\": \"$(echo $line | jq -r .name)\", \"address\": \"$address\", \"balance\": $balances }} "; fi; done; echo "]"' | jq"#,
            my_boxed_session.walletpassword,
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn delete_wallet(walletname: String, exception: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = match exception.as_str() {
        "celestia-lightd" | "celestia-bridge" => {
            format!(
                r#"yes '{}' | bash -c -l 'celestia-node/cel-key delete {} --node.type light --p2p.network blockspacerace --output json -y | awk "NR > 1"'"#,
                my_boxed_session.walletpassword, walletname
            )
        }
        _ => format!(
            r#"yes "{}" | bash -c -l '$EXECUTE keys delete {} -y --output json'"#,
            my_boxed_session.walletpassword, walletname
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn recover_wallet(
    walletname: String,
    mnemo: String,
    passwordneed: bool,
    exception: String,
) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    let command = match exception.as_str() {
        "celestia-lightd" | "celestia-bridge" => {
            format!(
                r#"echo -e '{}\n{}' | bash -c -l 'celestia-node/cel-key add {} --recover --node.type light --p2p.network blockspacerace --output json | awk "NR > 1" | jq -r .mnemonic'"#,
                mnemo,
                if passwordneed {
                    my_boxed_session.walletpassword.to_string() + "\n"
                } else {
                    String::new()
                },
                walletname
            )
        }
        _ => format!(
            "echo -e '{}\n{}' | bash -c -l '$EXECUTE keys add {} --recover --output json'",
            mnemo,
            if passwordneed {
                my_boxed_session.walletpassword.to_string() + "\n"
            } else {
                String::new()
            },
            walletname
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn set_main_wallet(walletname: String, exception: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = match exception.as_str() {
        "celestia-lightd" | "celestia-bridge" => {
            format!(
                r#"yes '{}' | bash -c -l 'systemctl stop {}; celestia light init --keyring.accname {} --p2p.network blockspacerace; systemctl start {}'"#,
                my_boxed_session.walletpassword, exception, walletname, exception
            )
        }
        _ => format!(
            "" // TODO
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

//
#[tauri::command(async)]
fn start_stop_restart_node(action: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command: String = format!("bash -c -l 'systemctl {} $EXECUTE'", action);
    channel.exec(&command).map_err(|e| e.to_string())?;
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

#[tauri::command(async)]
fn update_node(latest_version: String, exception: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = match exception.as_str() {
        "celestia-lightd" | "celestia-bridge" => {
            format!(
                "" // TODO
            )
        }
        _ => format!(
            "bash -c -l 'systemctl stop $EXECUTE; \
            git pull; \
            git checkout {latest_version}; \
            make install; \
            systemctl restart $EXECUTE'"
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
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
    channel.close().map_err(|e| e.to_string())?;
    if s.is_empty() {
        return Err("Your node is not running.".to_string());
    }
    Ok(s)
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
            set_main_wallet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
