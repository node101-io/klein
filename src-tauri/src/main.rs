#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use nosleep::{NoSleep, NoSleepType};
use ssh2::{DisconnectCode, Session};
use std::{
    io::{prelude::Read, Write},
    net::TcpStream,
    time::Duration,
};
use tauri::{LogicalSize, Manager, Size, Window};

struct SessionManager {
    open_session: Session,
    stop_cpu_mem_sync: bool,
    stop_installation: bool,
    stop_check_logs: bool,
    walletpassword: String,
}
static mut GLOBAL_STRUCT: Option<SessionManager> = None;

// SSH FUNCTIONS
#[tauri::command(async)]
fn log_in(ip: String, password: String, port: String) -> Result<String, String> {
    let tcp = TcpStream::connect(format!("{ip}:{port}")).map_err(|e| e.to_string())?;
    tcp.set_read_timeout(Some(Duration::from_secs(1)))
        .map_err(|e| e.to_string())?;
    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| e.to_string())?;
    sess.userauth_password("root", &password)
        .map_err(|_e: ssh2::Error| "Authentication failed!".to_string())?;
    unsafe {
        GLOBAL_STRUCT = Some(SessionManager {
            open_session: sess,
            stop_cpu_mem_sync: false,
            stop_installation: false,
            stop_check_logs: false,
            walletpassword: String::new(),
        });
    }
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    // my_boxed_session.open_session.set_keepalive(true, 60);
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel
        .exec(r#"bash -c -l 'echo { \"name\": \"$EXECUTE\", \"properly_installed\": \"$NODE_PROPERLY_INSTALLED\" }'"#)
        .map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s.trim().to_string())
}

#[tauri::command(async)]
fn log_out() -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    my_boxed_session
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
fn log_in_again(ip: String, password: String, port: String) -> Result<(), String> {
    let tcp2 = TcpStream::connect(format!("{ip}:{port}")).map_err(|e| e.to_string())?;
    tcp2.set_read_timeout(Some(Duration::from_secs(1)))
        .map_err(|e| e.to_string())?;
    let mut sess2 = Session::new().map_err(|e| e.to_string())?;
    sess2.set_tcp_stream(tcp2);
    sess2.handshake().map_err(|e| e.to_string())?;
    sess2
        .userauth_password("root", &password)
        .map_err(|_e| "Authentication failed!".to_string())?;
    log_out().map_err(|e| e.to_string())?;
    Ok(())
}

// CPU, MEM, SYNC, VERSION FUNCTIONS
#[tauri::command(async)]
fn cpu_mem_sync(window: Window, exception: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let (status_command, height_command, catchup_command, version_command) = match exception.as_str() {
        "celestia-light" => (
            format!("$(systemctl is-active {exception}*.service 2>/dev/null)"),
            "$(curl -sX GET http://127.0.0.1:26659/head | jq -r .header.height 2>/dev/null)",
            "$(echo $(if [ $((10#$(curl -sX GET https://rpc-mocha.pops.one/block | jq -r .result.block.header.height) > 10#$(curl -sX GET http://127.0.0.1:26659/head | jq -r .header.height))) -eq 1 ]; then echo true; else echo false; fi) 2>/dev/null)",
            r#"$(celestia version | grep -oP "Semantic version: \K[^ ]+" 2>/dev/null)"#,
        ),
        "babylon" => (
            "$(systemctl is-active $EXECUTE 2>/dev/null)".to_string(),
            r#"$($EXECUTE status 2>&1 | jq -r \""\(.sync_info.latest_block_height)"\" 2>/dev/null)"#,
            r#"$($EXECUTE status 2>&1 | jq -r \""\(.sync_info.catching_up)"\" 2>/dev/null)"#,
            r#"$($EXECUTE version 2>&1)"#,
        ),
        _ => (
            "$(systemctl is-active $EXECUTE 2>/dev/null)".to_string(),
            r#"$($EXECUTE status 2>&1 | jq -r \""\(.SyncInfo.latest_block_height)"\" 2>/dev/null)"#,
            r#"$($EXECUTE status 2>&1 | jq -r \""\(.SyncInfo.catching_up)"\" 2>/dev/null)"#,
            r#"$($EXECUTE version 2>&1)"#,
        ),
    };
    channel
        .exec(&*format!(
            r#"bash -c -l 'while true; do
            echo -n "{{ \"cpu\": \"$(top -b -n1 | awk '\''/Cpu\(s\)/{{print 100-$8}}'\'' 2>/dev/null)\", \"mem\": \"$(top -b -n1 | awk '\''/MiB Mem/{{print ($4-$6)/$4*100}}'\'' 2>/dev/null)\", \"status\": \"{status_command}\", \"height\": \"{height_command}\", \"catchup\": \"{catchup_command}\", \"version\": \"{version_command}\" }}";
            sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo "";
            sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo "";
            sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo "";
            sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo "";
            sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; sleep 0.2; echo ""; done'"#
        ))
        .map_err(|e| e.to_string())?;

    my_boxed_session.stop_cpu_mem_sync = false;
    loop {
        if my_boxed_session.stop_cpu_mem_sync {
            channel.close().map_err(|e| e.to_string())?;
            return Ok(());
        }
        let mut buf = [0u8; 1024];
        let len = channel.read(&mut buf).map_err(|e| e.to_string())?;
        let s = std::str::from_utf8(&buf[0..len]).map_err(|e| e.to_string())?;
        if s.starts_with("{") {
            let _ = window
                .emit("cpu_mem_sync", s.to_string())
                .map_err(|e| e.to_string())?;
        }
    }
}

#[tauri::command(async)]
fn cpu_mem_sync_stop() -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    my_boxed_session.stop_cpu_mem_sync = true;
    std::thread::sleep(std::time::Duration::from_millis(200));
    Ok(())
}

// NODE FUNCTIONS
#[tauri::command(async)]
fn check_logs(window: Window) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel
        .exec(r#"bash -c -l 'journalctl -fu $EXECUTE -o cat'"#)
        .map_err(|e| e.to_string())?;
    my_boxed_session.stop_check_logs = false;
    loop {
        if my_boxed_session.stop_check_logs {
            channel.close().map_err(|e| e.to_string())?;
            return Ok(());
        }
        let mut buf = [0u8; 1024];
        let len = channel.read(&mut buf).map_err(|e| e.to_string())?;
        let s = std::str::from_utf8(&buf[0..len]).map_err(|e| e.to_string())?;
        let converted = ansi_to_html::convert_escaped(s).map_err(|e| e.to_string())?;
        let _ = window
            .emit("check_logs", converted)
            .map_err(|e| e.to_string())?;
    }
}

#[tauri::command(async)]
fn stop_check_logs() -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    my_boxed_session.stop_check_logs = true;
    std::thread::sleep(std::time::Duration::from_millis(200));
    Ok(())
}

#[tauri::command(async)]
fn install_node(network: String, identifier: String, window: Window) -> Result<(), String> {
    let mut nosleep = NoSleep::new().unwrap();
    nosleep
        .start(NoSleepType::PreventUserIdleDisplaySleep)
        .unwrap();

    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&format!(
        "echo 'export MONIKER=node101' >> $HOME/.bash_profile; echo 'export WALLET_NAME=node101' >> $HOME/.bash_profile; \
        wget -O {identifier}.sh https://raw.githubusercontent.com/node101-io/klein-scripts/main/{network}/{identifier}/{identifier}.sh && chmod +x {identifier}.sh && ./{identifier}.sh"
    )).map_err(|e| e.to_string())?;
    my_boxed_session.stop_installation = false;
    loop {
        if my_boxed_session.stop_installation {
            channel.close().map_err(|e| e.to_string())?;
            return Err("Installation cancelled.".to_string());
        }
        let mut buf = [0u8; 1024];
        let len = channel.read(&mut buf).map_err(|e| e.to_string())?;
        if len == 0 {
            channel.close().map_err(|e| e.to_string())?;
            break;
        }
        let s = std::str::from_utf8(&buf[0..len]).map_err(|e| e.to_string())?;
        println!("{}", s);
        if s.contains("installation_progress") {
            let _ = window
                .emit("installation_progress", s.to_string())
                .map_err(|e| e.to_string())?;
        }
        if s.contains("SETUP IS FINISHED") {
            channel.close().map_err(|e| e.to_string())?;
            nosleep.stop().unwrap();
            return Ok(());
        }
        std::io::stdout().flush().map_err(|e| e.to_string())?;
    }
    Err("Something went wrong.".to_string())
}

#[tauri::command(async)]
fn stop_installation() -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_mut() }.ok_or("There is no active session. Timed out.")?;
    my_boxed_session.stop_installation = true;
    std::thread::sleep(std::time::Duration::from_secs(1));
    Ok(())
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
        "celestia-light" => format!(r#"bash -c -l "
            sudo systemctl stop $EXECUTE;
            sudo systemctl disable $EXECUTE;
            pkill -f $EXECUTE;
            sudo rm -rf .celestia-app .celestia-light-mocha-4;
            sudo rm -rf $(which celestia);
            sudo rm -rf $(which celestia-appd);
            if [ -d "/etc/systemd/system/$EXECUTE*" ]; then
                sudo rm -rf "/etc/systemd/system/${{EXECUTE}}"*;
            fi
            if [ -d "$HOME/$SYSTEM_FOLDER" ]; then
                sudo rm -rf "$HOME/$SYSTEM_FOLDER"*;
            fi
            if [ -d "$HOME/$PROJECT_FOLDER" ]; then
                sudo rm -rf "$HOME/$PROJECT_FOLDER"*;
            fi
            if [ -d "$HOME/$EXECUTE" ]; then
                sudo rm -rf "$HOME/$EXECUTE"*;
            fi
            sudo rm -rf /usr/local/go /root/go;
            sed -i '/MAIN_WALLET_NAME/d; /MAIN_WALLET_ADDRESS/d; /NODE_PROPERLY_INSTALLED/d; /EXECUTE/d; /CHAIN_ID/d; /PORT/d; /DENOM/d; /SEEDS/d; /PEERS/d; /VERSION/d; /SYSTEM_FOLDER/d; /PROJECT_FOLDER/d; /GO_VERSION/d; /GENESIS_FILE/d; /ADDRBOOK/d; /MIN_GAS/d; /SEED_MODE/d; /REPO/d; /MONIKER/d; /SNAPSHOT_URL/d; /WALLET_NAME/d' ~/.bash_profile; source ~/.bash_profile;
            unset NODE_PROPERLY_INSTALLED EXECUTE CHAIN_ID PORT DENOM SEEDS PEERS VERSION SYSTEM_FOLDER PROJECT_FOLDER GO_VERSION GENESIS_FILE ADDRBOOK MIN_GAS SEED_MODE REPO MONIKER SNAPSHOT_URL WALLET_NAME""#
        ),
        _ => format!(r#"bash -c -l '
            sudo systemctl stop $EXECUTE;
            sudo systemctl disable $EXECUTE;
            pkill -f $EXECUTE;
            if [ -d "/etc/systemd/system/$EXECUTE" ]; then
                sudo rm -rf "/etc/systemd/system/${{EXECUTE}}"*;
            fi
            if [ -d "$(which $EXECUTE)" ]; then
                sudo rm -rf "$(which $EXECUTE)"*;
            fi
            if [ -d "$HOME/$SYSTEM_FOLDER" ]; then
                sudo rm -rf "$HOME/$SYSTEM_FOLDER"*;
            fi
            if [ -d "$HOME/$PROJECT_FOLDER" ]; then
                sudo rm -rf "$HOME/$PROJECT_FOLDER"*;
            fi
            if [ -d "$HOME/$EXECUTE" ]; then
                sudo rm -rf "$HOME/$EXECUTE"*;
            fi
            sudo rm -rf /usr/local/go /root/go;
            sed -i "/MAIN_WALLET_NAME/d; /MAIN_WALLET_ADDRESS/d; /NODE_PROPERLY_INSTALLED/d; /EXECUTE/d; /CHAIN_ID/d; /PORT/d; /DENOM/d; /SEEDS/d; /PEERS/d; /VERSION/d; /SYSTEM_FOLDER/d; /PROJECT_FOLDER/d; /GO_VERSION/d; /GENESIS_FILE/d; /ADDRBOOK/d; /MIN_GAS/d; /SEED_MODE/d; /REPO/d; /MONIKER/d; /SNAPSHOT_URL/d; /WALLET_NAME/d" ~/.bash_profile; source ~/.bash_profile;
            unset NODE_PROPERLY_INSTALLED EXECUTE CHAIN_ID PORT DENOM SEEDS PEERS VERSION SYSTEM_FOLDER PROJECT_FOLDER GO_VERSION GENESIS_FILE ADDRBOOK MIN_GAS SEED_MODE REPO MONIKER SNAPSHOT_URL WALLET_NAME'"#
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    println!("{}", s);
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

// KEYRING FUNCTIONS
#[tauri::command(async)]
fn password_keyring_check(exception: String) -> Result<(bool, bool), String> {
    if exception == "celestia-light" {
        return Ok((false, false));
    }
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
    Ok((
        !s.starts_with("{") && !s.starts_with("["),
        s.contains("password_does_exist"),
    ))
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
        "babylon" => format!(
            r#"echo -e '{}\ny\n' | bash -c -l '$EXECUTE keys add {} --keyring-backend test --output json 2>&1 | jq -r .mnemonic'"#,
            my_boxed_session.walletpassword, walletname
        ),
        "celestia-light" => format!(
            r#"bash -c -l 'celestia-node/cel-key add {walletname} --node.type light --p2p.network mocha --output json 2>&1 | awk "NR > 1" | jq -r .mnemonic'"#
        ),
        _ => format!(
            r#"echo -e '{}\ny\n' | bash -c -l '$EXECUTE keys add {} --output json 2>&1 | jq -r .mnemonic'"#,
            my_boxed_session.walletpassword, walletname
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
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
        "babylon" => format!(
            r#"yes '{}' | bash -c -l 'echo -n "["; first=true; $EXECUTE keys list --output json --keyring-backend test | jq -c ".[]" | while read -r line; do address=$(echo $line | jq -r ".address"); balances=$($EXECUTE query bank balances $address --output json); if [ $first = true ]; then echo -n " {{ \"name\": \"$(echo $line | jq -r .name)\", \"address\": \"$address\", \"balance\": $balances, \"denom\": \"$DENOM\" }} "; first=false; else echo -n ", {{ \"name\": \"$(echo $line | jq -r .name)\", \"address\": \"$address\", \"balance\": $balances }} "; fi; done; echo "]"' | jq"#,
            my_boxed_session.walletpassword,
        ),
        "celestia-light" => format!(
            r#"bash -c -l 'echo -n "["; first=true; celestia-node/cel-key list --node.type light --p2p.network mocha --output json | awk "NR > 1" | jq -c ".[]" | while read -r line; do address=$(echo $line | jq -r ".address"); balances=$(curl -sX GET http://localhost:26659/balance/$address); if [ $first = true ]; then echo -n "{{\"name\": \"$(echo $line | jq -r ".name")\", \"address\": \"$address\", \"balance\": {{ \"balances\": [ $balances ] }}, \"denom\": \"$DENOM\"}}"; first=false; else echo -n ",{{\"name\": \"$(echo $line | jq -r ".name")\", \"address\": \"$address\", \"balance\": {{ \"balances\": [ $balances ] }}}}"; fi; done; echo "]"' | jq"#,
        ),
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
        "babylon" => format!(
            r#"yes "{}" | bash -c -l '$EXECUTE keys delete {} -y --output json --keyring-backend test'"#,
            my_boxed_session.walletpassword, walletname
        ),
        "celestia-light" => format!(
            r#"yes '{}' | bash -c -l 'celestia-node/cel-key delete {} --node.type light --p2p.network mocha --output json -y | awk "NR > 1"'"#,
            my_boxed_session.walletpassword, walletname
        ),
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
        "babylon" => format!(
            "echo -e '{}\n{}' | bash -c -l '$EXECUTE keys add {} --recover --output json --keyring-backend test'",
            mnemo,
            if passwordneed {
                my_boxed_session.walletpassword.to_string() + "\n"
            } else {
                String::new()
            },
            walletname
        ),
        "celestia-light" => format!(
            r#"echo -e '{}\n{}' | bash -c -l 'celestia-node/cel-key add {} --recover --node.type light --p2p.network mocha --output json | awk "NR > 1"'"#,
            mnemo,
            if passwordneed {
                my_boxed_session.walletpassword.to_string() + "\n"
            } else {
                String::new()
            },
            walletname
        ),
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
fn set_main_wallet(walletname: String, address: String, exception: String) -> Result<(), String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = match exception.as_str() {
        "celestia-light" => format!(
            r#"yes '{}' | bash -c -l 'systemctl stop $EXECUTE; celestia light init --keyring.accname {} --p2p.network mocha; systemctl start $EXECUTE'; echo 'export MAIN_WALLET_NAME={}' >> $HOME/.bash_profile; echo 'export MAIN_WALLET_ADDRESS={}' >> $HOME/.bash_profile; source $HOME/.bash_profile"#,
            my_boxed_session.walletpassword,
            walletname,
            walletname,
                address
        ),
        _ => format!(
            "echo 'export MAIN_WALLET_NAME={}' >> $HOME/.bash_profile; echo 'export MAIN_WALLET_ADDRESS={}' >> $HOME/.bash_profile; source $HOME/.bash_profile",
            walletname, address
        ),
    };
    channel.exec(&command).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn get_main_wallet() -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = format!(
        r#"bash -c -l 'echo "{{ \"name\": \"$MAIN_WALLET_NAME\", \"address\": \"$MAIN_WALLET_ADDRESS\" }}"'"#
    );
    channel.exec(&command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn get_chain_id() -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = format!(r#"bash -c -l 'echo "{{ \"chain_id\": \"$CHAIN_ID\" }}"'"#);
    channel.exec(&command).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
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
        "celestia-full" => format!(
            "bash -c -l 'systemctl stop $EXECUTE;
            cd celestia-node;
            git fetch --tags;
            git checkout {latest_version};
            make build;
            sudo make install;
            systemctl restart $EXECUTE;'"
        ),
        "lava-network" => format!(
            "bash -c -l '
            cd $PROJECT_FOLDER;
            git pull;
            git checkout {latest_version};
            export LAVA_BINARY=lavad;
            make build;
            mkdir -p $HOME/$SYSTEM_FOLDER/cosmovisor/upgrades/{latest_version}/bin;
            mv $(which $EXECUTE) $HOME/$SYSTEM_FOLDER/cosmovisor/upgrades/{latest_version}/bin/;
            rm -rf build;'"
        ),
        _ => format!(
            "bash -c -l '
            cd $PROJECT_FOLDER;
            git pull;
            git checkout {latest_version};
            make build;
            mkdir -p $HOME/$SYSTEM_FOLDER/cosmovisor/upgrades/{latest_version}/bin;
            mv $(which $EXECUTE) $HOME/$SYSTEM_FOLDER/cosmovisor/upgrades/{latest_version}/bin/;
            rm -rf build;'"
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
    println!("{:?}", s);
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
    exception: String,
) -> Result<String, String> {
    println!("{}", exception);
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx {operation} delegate {validator_valoper} {amount}$DENOM --from={wallet_name} --fees={fees}$DENOM --chain-id=$CHAIN_ID --gas-adjustment 1.4 --output json {extra}'",
        password = my_boxed_session.walletpassword,
        operation = match exception.as_str() {
            "babylon" => "epoching",
            _ => "staking",
        },
        extra = match exception.as_str() {
            "babylon" => "-y",
            _ => "--gas=auto -y",
        }
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
    exception: String
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&*format!(
        "yes '{password}' |  bash -c -l '$EXECUTE tx {operation} redelegate {first_validator} {destination_validator} {amount}$DENOM --from={wallet_name} --fees={fees}$DENOM --chain-id=$CHAIN_ID --gas=auto --output json {extra}'",
        password = my_boxed_session.walletpassword,
        operation = match exception.as_str() {
            "babylon" => "epoching",
            _ => "staking",
        },
        extra = match exception.as_str() {
            "babylon" => "--keyring-backend test --gas-adjustment 1.4 -y",
            _ => "",
        }
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
    exception: String
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&*format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx gov vote {proposal_number} {selected_option} --from {wallet_name} --chain-id=$CHAIN_ID {extra} -y'",
        password = my_boxed_session.walletpassword,
        extra = match exception.as_str() {
            "babylon" => "--keyring-backend test",
            _ => "",
        }
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
    exception: String
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&*format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx bank send {wallet_name} {receiver_address} {amount}$DENOM -y --fees={fees}$DENOM --output json {extra}'",
        password = my_boxed_session.walletpassword,
        extra = match exception.as_str() {
            "babylon" => "--keyring-backend test",
            _ => "",
        }
    )).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn unjail(
    wallet_name: String,
    fees: String,
    exception: String
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx slashing unjail --from={wallet_name} --chain-id=$CHAIN_ID --gas=auto --fees{fees}$DENOM {extra} -y'",
        password = my_boxed_session.walletpassword,
        extra = match exception.as_str() {
            "babylon" => "--keyring-backend test",
            _ => "",
        }
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
    exception: String,
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    let command = match exception.as_str() {
        "babylon" => format!(
            r#"bash -c -l 'touch $HOME/$SYSTEM_FOLDER/data/validator.json' &&
            bash -c -l 'echo {{ \
                \"pubkey\": $(babylond tendermint show-validator), \
                \"amount\": \"{amount}$DENOM\", \
                \"moniker\": \"{moniker_name}\", \
                \"identity\": \"{keybase_id}\", \
                \"website\": \"{website}\", \
                \"details\": \"{details}\", \
                \"commission-rate\": \"{com_rate}\", \
                \"commission-max-rate\": \"0.20\", \
                \"commission-max-change-rate\": \"0.01\", \
                \"min-self-delegation\": \"1\" \
            }} > $HOME/$SYSTEM_FOLDER/data/validator.json' &&
            yes '{password}' | bash -c -l '$EXECUTE tx checkpointing create-validator $HOME/$SYSTEM_FOLDER/data/validator.json -y \
                --output json \
                --keyring-backend test \
                --chain-id=$CHAIN_ID \
                --gas=auto \
                --gas-adjustment=1.4 \
                --fees={fees}$DENOM \
                --from={wallet_name}' 2>&1"#,
            password = my_boxed_session.walletpassword,
        ),
        _ => format!(
            "yes '{password}' | bash -c -l '$EXECUTE tx staking create-validator -y \
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
                --gas=auto \
                --gas-prices={fees}$DENOM \
                --min-self-delegation=1 \
                --details={details}'",
            password = my_boxed_session.walletpassword,
        ),
    };
    println!("{}", command);
    let mut s = String::new();
    channel.exec(&command).map_err(|e| e.to_string())?;
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    println!("{}", s);
    Ok(s)
}

#[tauri::command(async)]
fn edit_validator(
    wallet_name: String,
    website: String,
    contact: String,
    keybase_id: String,
    com_rate: String,
    details: String,
    exception: String,
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
            "yes '{password}' | bash -c -l '$EXECUTE tx {operation} edit-validator \
                --output json \
                --keyring-backend test \
                --from={wallet_name} \
                --website={website} \
                --security-contact={contact} \
                --identity={keybase_id} \
                --commission-rate={com_rate} \
                --details={details} 2>&1'",
            password = my_boxed_session.walletpassword,
            operation = match exception.as_str() {
                "babylon" => "staking",
                _ => "staking",
            },
        ))
        .map_err(|e| e.to_string())?;
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    println!("{}", s);
    Ok(s)
}

#[tauri::command(async)]
fn withdraw_rewards(
    valoper_address: String,
    wallet_name: String,
    exception: String
) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&format!(
        "yes '{password}' | bash -c -l '$EXECUTE tx distribution withdraw-rewards {valoper_address} --from={wallet_name} --commission --chain-id=$CHAIN_ID {extra}'",
        password = my_boxed_session.walletpassword,
        extra = match exception.as_str() {
            "babylon" => "--keyring-backend test",
            _ => "",
        }
    )).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command(async)]
fn create_bls_key(wallet_name: String) -> Result<String, String> {
    let my_boxed_session =
        unsafe { GLOBAL_STRUCT.as_ref() }.ok_or("There is no active session. Timed out.")?;
    let mut channel = my_boxed_session
        .open_session
        .channel_session()
        .map_err(|e| e.to_string())?;
    channel.exec(&format!(
        "yes '{password}' | bash -c -l '$EXECUTE create-bls-key $($EXECUTE keys show {wallet_name} -a --keyring-backend test) 2>&1'",
        password = my_boxed_session.walletpassword,
    )).map_err(|e| e.to_string())?;
    let mut s = String::new();
    channel.read_to_string(&mut s).map_err(|e: std::io::Error| e.to_string())?;
    channel.close().map_err(|e| e.to_string())?;
    Ok(s)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app.get_window("main")
                .unwrap()
                .set_min_size(Some(Size::Logical(LogicalSize {
                    width: 900.0,
                    height: 600.0,
                })))
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
            password_keyring_check,
            create_keyring,
            delete_keyring,
            check_keyring_passphrase,
            create_validator,
            delegate_token,
            redelegate_token,
            validator_list,
            set_main_wallet,
            get_main_wallet,
            get_chain_id,
            stop_installation,
            check_logs,
            stop_check_logs,
            create_bls_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
