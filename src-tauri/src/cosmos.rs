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

#[tauri::command(async)]
fn cpu_mem_sync_stop(mut GLOBAL_STRUCT:Option<SessionManager>) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            my_boxed_session.stop_cpu_mem_sync = true;
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
async fn cpu_mem_sync(mut GLOBAL_STRUCT:Option<SessionManager>,window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel.exec(&*format!("
                export PATH=$PATH:/usr/local/go/bin:/root/go/bin;
                while true; 
                    do
                        cpu_mem=\"$(top -b -n1 | awk '/Cpu\\(s\\)/{{print \"CPU:\" 100-$8}} /MiB Mem/{{print \"MEM:\"($4-$6)/$4*100}}')\"; 
                        service_status=\"$(systemctl is-active $(bash -c -l 'echo -n $EXECUTE') 2>/dev/null)\";
                        sync_status=\"$($(bash -c -l 'echo -n $EXECUTE') status 2>&1 | jq -r '\"HEIGHT:\\(.SyncInfo.latest_block_height)\", \"CATCHUP:\\(.SyncInfo.catching_up)\", \"VERSION:\\(.NodeInfo.version)\"' 2>/dev/null)\";
                        echo -n \"$cpu_mem\nSTATUS:$service_status\n$sync_status\"; 
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
}

#[tauri::command(async)]
fn node_info(mut GLOBAL_STRUCT:Option<SessionManager>) -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel
                .exec(&format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; $(bash -c -l 'echo $EXECUTE') status 2>&1 | jq"))
                .unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            channel.close().unwrap();
            s
        } else {
            "".to_string()
        }
    }
}

#[tauri::command(async)]
fn delete_node(mut GLOBAL_STRUCT:Option<SessionManager>) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
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
}

#[tauri::command(async)]
fn install_node(mut GLOBAL_STRUCT:Option<SessionManager>,window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel.exec(&format!("echo 'export MONIKER=node101' >> $HOME/.bash_profile; echo 'export WALLET_NAME=node101' >> $HOME/.bash_profile; wget -O band.sh https://node101.io/mainnet/bandprotocol/band.sh && chmod +x band.sh && ./band.sh")).unwrap();
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
                }
                std::io::stdout().flush().unwrap();
            }
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn if_password_required(mut GLOBAL_STRUCT:Option<SessionManager>) -> bool {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
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
                delete_wallet(GLOBAL_STRUCT,"testifpasswordneeded".to_string());
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
}

#[tauri::command(async)]
fn if_keyring_exist(mut GLOBAL_STRUCT:Option<SessionManager>) -> bool {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
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
}

#[tauri::command(async)]
fn create_keyring(mut GLOBAL_STRUCT:Option<SessionManager>,passphrase: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel
                .exec(&*format!(
                    "echo -e '{passphrase}\n{passphrase}\n' | bash -c -l '$EXECUTE keys add forkeyringpurpose --output json'; yes \"{passphrase}\" | bash -c -l '$EXECUTE keys delete forkeyringpurpose -y --output json'"                ))
                .unwrap();
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn delete_keyring(mut GLOBAL_STRUCT:Option<SessionManager>) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel
                .exec(&*format!(
                    "bash -c -l 'cd $HOME/$SYSTEM_FOLDER; rm -rf keyhash *.address *.info;'"
                ))
                .unwrap();
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn check_wallet_password(mut GLOBAL_STRUCT:Option<SessionManager>,passw: String) -> bool {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
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
                GLOBAL_STRUCT.as_mut().unwrap().walletpassword = passw.to_string();
                channel.close().unwrap();
                delete_wallet(GLOBAL_STRUCT,"testifpasswordcorrect".to_string());
                true
            } else {
                channel.close().unwrap();
                false
            }
        } else {
            println!("error in check_wallet_password");
            false
        }
    }
}

#[tauri::command(async)]
fn create_wallet(mut GLOBAL_STRUCT:Option<SessionManager>,walletname: String) -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
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
}

#[tauri::command(async)]
fn if_wallet_exists(mut GLOBAL_STRUCT:Option<SessionManager>,walletname: String) -> bool {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                "echo -e {} | bash -c -l '$EXECUTE keys list --output json'",
                GLOBAL_STRUCT.as_mut().unwrap().walletpassword,
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
}

#[tauri::command(async)]
fn show_wallets(mut GLOBAL_STRUCT:Option<SessionManager>) -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                "yes \"{}\" | bash -c -l '$EXECUTE keys list --output json'",
                GLOBAL_STRUCT.as_mut().unwrap().walletpassword,
            );
            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            channel.close().unwrap();
            s
        } else {
            println!("error in show_wallets");
            "".to_string()
        }
    }
}

#[tauri::command(async)]
fn delete_wallet(mut GLOBAL_STRUCT:Option<SessionManager>,walletname: String) -> () {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                "yes \"{}\" | bash -c -l '$EXECUTE keys delete {} -y --output json'",
                GLOBAL_STRUCT.as_mut().unwrap().walletpassword,
                walletname
            );
            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn start_stop_restart_node(mut GLOBAL_STRUCT:Option<SessionManager>,action: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!("bash -c -l 'systemctl {} $EXECUTE'", action);
            channel.exec(&*command).unwrap();
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn recover_wallet(mut GLOBAL_STRUCT:Option<SessionManager>,walletname: String, mnemo: String, passwordneed: bool) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            channel
                .exec(&*format!(
                    "echo -e '{}\n{}' | bash -c -l '$EXECUTE keys add {} --recover --output json'",
                    mnemo,
                    if passwordneed {
                        my_boxed_session.walletpassword.to_string() + "\n"
                    } else {
                        "".to_string()
                    },
                    walletname
                ))
                .unwrap();
            channel.read_to_string(&mut s).unwrap();
            println!("Recovered: {}", s);
            channel.close().unwrap();
        }
    }
}

// BELOW IS NOT TESTED YET
#[tauri::command(async)]
fn update_node(mut GLOBAL_STRUCT:Option<SessionManager>) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel
                .exec(&format!("bash -c -l '$EXECUTE version'"))
                .unwrap();
            let mut current_version = String::new();
            channel.read_to_string(&mut current_version).unwrap();
            channel.flush().unwrap();
            println!("{}", current_version);
            let mut channel1 = my_boxed_session.open_session.channel_session().unwrap();
            let mut repo = String::new();
            channel1
                .exec(&format!("grep 'REPO=' .bash_profile | sed 's/^.*: //"))
                .unwrap();
            channel1.read_to_string(&mut repo).unwrap();
            println!("ASDAS {}", repo);
            // let url = "https://api.github.com/repos/confio/tgrade/releases";
            // let releases: Vec<Release> = reqwest::get(url).await?.json().await?;
            // if releases.is_empty() {
            //     println!("No releases found in the repository.");
            // } else {
            //     let latest_stable_release =
            //         releases.into_iter().find(|release| !release.prerelease);
            //     match latest_stable_release {
            //         Some(release) => println!("Latest stable release: {}", release.tag_name),
            //         None => println!("No stable releases found in the repository."),
            //     }
            // }
        }
    }
}

#[tauri::command(async)]
fn delegate_token(mut GLOBAL_STRUCT:Option<SessionManager>,wallet_name: String, validator_valoper: String, amount: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            // channel.exec(&format!(
            //     "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx staking delegate {valoper} {amount}$DENOM --from={wallet_name} --chain-id=$CHAIN_ID --gas='auto' --fees={fee}$DENOM ;")).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            // println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn redelegate_token(
    mut GLOBAL_STRUCT:Option<SessionManager>,
    wallet_name: String,
    destination_validator: String,
    fees: String,
    first_validator: String,
) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            // let command: String = format!(
            //     "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx staking rewdelegate {first_address} {destination} {amount}$DENOM --from={wallet_name} --chain-id=$CHAIN_ID --gas='auto' --fees={fee}$DENOM ;");
            // channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            // println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn vote(mut GLOBAL_STRUCT:Option<SessionManager>,wallet_name: String, proposal_number: String, selected_option: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel.exec(&*format!("bash -c -l \"$EXECUTE tx gov vote {proposal_number} {selected_option} --from {wallet_name} --chain-id=$CHAIN_ID -y\"")).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn send_token(mut GLOBAL_STRUCT:Option<SessionManager>,wallet_name: String, receiver_address: String, amount: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel.exec(&*format!("bash -c -l \"$EXECUTE tx bank send {wallet_name} {receiver_address} {amount}$DENOM -y\"")).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn unjail(mut GLOBAL_STRUCT:Option<SessionManager>) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            // let nd = &my_boxed_session.existing_node;
            // let command: String = format!(
            //     "yes \"{password}\" | export PATH=$PATH:/usr/local/go/bin:/root/go/bin; {nd} tx slashing unjail  --broadcast-mode=block --from=$WALLET_NAME --chain-id=$CHAIN_ID --gas=auto --fees {fees}$DENOM"
            // );
            // channel.exec(&command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            println!("Will return mnemonics if created first, if not then will return a success or anything.");
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn create_validator(
    mut GLOBAL_STRUCT:Option<SessionManager>,
    website: String,
    amount: String,
    wallet_name: String,
    com_rate: String,
    moniker_name: String,
    keybase_id: String,
    contact: String,
    fees: String,
    details: String,
) -> (bool, String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            channel.exec(&format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; bash -c -l '$EXECUTE tx staking create-validator -y \
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
                --details={details}'"
            )).unwrap();
            channel.read_to_string(&mut s).unwrap();
            channel.close().unwrap();
            (true, s)
        } else {
            (false, String::new())
        }
    }
}


#[tauri::command(async)]
fn edit_validator(
    mut GLOBAL_STRUCT:Option<SessionManager>,
    amount: String,
    wallet_name: String,
    website: String,
    contact: String,
    keybase_id: String,
    com_rate: String,
    details: String,
) -> bool {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            channel.exec(&format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; bash -c -l \"$EXECUTE tx staking edit-validator \
                --pubkey=$($EXECUTE tendermint show-validator) \
                --amount={amount}$DENOM \
                --from={wallet_name} \
                --website={website} \
                --security-contact={contact} \
                --identity={keybase_id} \
                --commission-rate={com_rate} \
                --details={details}\""
            )).unwrap();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
            true
        } else {
            false
        }
    }
}

#[tauri::command(async)]
fn withdraw_rewards(mut GLOBAL_STRUCT:Option<SessionManager>) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            // channel.exec(&format!(
            //     "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; $EXECUTE tx distribution withdraw-rewards {valoper} --from={wallet_name} --commission --chain-id=$CHAIN_ID;")).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}
