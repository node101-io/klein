#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde_json::{self, json, Value};
use ssh2::{DisconnectCode, Session};
use std::{io::Read, thread, time};
use tauri::{LogicalSize, Manager};

struct SessionManager {
    open_session: Session,
    stop_cpu_mem_sync: bool,
    walletpassword: String,
}

static mut GLOBAL_STRUCT: Option<SessionManager> = None;

async fn create_session(session: Session) -> SessionManager {
    let alive_session = SessionManager {
        open_session: session,
        stop_cpu_mem_sync: false,
        walletpassword: String::new(),
    };
    alive_session
}

#[tauri::command(async)]
async fn log_in(ip: String, password: String, remember: bool, window: tauri::Window) {
    let tcp = std::net::TcpStream::connect(format!("{ip}:22")).unwrap();
    tcp.set_read_timeout(Some(std::time::Duration::from_secs(1)))
        .unwrap();
    let mut sess = Session::new().unwrap();
    sess.set_tcp_stream(tcp);
    sess.handshake().unwrap();
    let res = sess.userauth_password("root", &password);

    let client = reqwest::Client::new();
    let projects_data = client
                .get("https://admin.node101.io/api/projects")
                .header(
                    "Cookie",
                    client
                        .post("https://admin.node101.io/api/authenticate")
                        .json(&json!({ "key": "b8737b4ca31571d769506c4373f5c476e0a022bf58d5e0595c0e37eabb881ad150b8c447f58d5f80f6ffe5ced6f21fe0502c12cf32ab33c6f0787aea5ccff153" }))
                        .send()
                        .await
                        .unwrap()
                        .headers()
                        .get("set-cookie")
                        .unwrap()
                        .to_str()
                        .unwrap(),
                )
                .send()
                .await
                .unwrap();

    let v: Value = serde_json::from_str(&projects_data.text().await.unwrap()).unwrap();
    let projects = v["projects"].as_array().unwrap();
    let data: Vec<(&str, String)> = projects
        .iter()
        .map(|p| {
            (
                p.get("name").and_then(Value::as_str).unwrap(),
                p.get("wizard_key")
                    .map(|v| v.to_string().replace("\"", ""))
                    .unwrap(),
            )
        })
        .collect();

    if res.is_ok() {
        unsafe {
            GLOBAL_STRUCT = Some(create_session(sess).await);

            if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
                let mut channel = my_boxed_session.open_session.channel_session().unwrap();
                channel.exec("bash -c -l 'echo $EXECUTE'").unwrap();
                let mut s = String::new();
                channel.read_to_string(&mut s).unwrap();

                let mut found = false;
                for item in data {
                    if s.trim() == item.1 {
                        window
                            .eval(&format!(
                                "window.loadNewPage('manage-node/manage-node.html', {}, '{}')",
                                remember, item.0
                            ))
                            .unwrap();
                        found = true;
                        break;
                    }
                }
                if !found {
                    window
                        .eval(&format!(
                            "window.loadNewPage('home-page/home-page.html', {remember}, '')"
                        ))
                        .unwrap();
                }

                channel.close().unwrap();
            }
            cpu_mem_sync(window.clone()).await;
        }
    } else {
        window.eval("window.showLoginError()").unwrap();
    }
}

#[tauri::command(async)]
fn log_out() {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            (*my_boxed_session)
                .open_session
                .disconnect(
                    Some(DisconnectCode::AuthCancelledByUser),
                    "Disconnecting from server",
                    None,
                )
                .unwrap();

            // GLOBAL_STRUCT = None;
        }
    }
}

#[tauri::command(async)]
fn cpu_mem_sync_stop(a: bool) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            my_boxed_session.stop_cpu_mem_sync = a;
        }
    }
}

#[tauri::command(async)]
async fn cpu_mem_sync(window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            loop {
                if my_boxed_session.stop_cpu_mem_sync {
                    break;
                }

                let channel_result = my_boxed_session.open_session.channel_session();
                let mut channel = match channel_result {
                    Ok(channel) => channel,
                    Err(err) => {
                        println!("Error opening channel: {}", err);
                        cpu_mem_sync(window.clone());
                        return;
                    }
                };

                let mut s = String::new();
                channel.exec("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; echo $(top -b -n1 | awk '/Cpu\\(s\\)/{{print 100-$8}} /MiB Mem/{{print ($4-$6)/$4*100}}'; echo \\'$(systemctl is-active $(bash -c -l 'echo $EXECUTE'))\\'; $(bash -c -l 'echo $EXECUTE') status 2>&1 | jq .SyncInfo.latest_block_height,.SyncInfo.catching_up,.NodeInfo.version)").unwrap();
                channel.read_to_string(&mut s).unwrap();
                println!("{}", s);

                window
                    .eval(&*format!(
                        "window.updateCpuMemSync({});",
                        s.trim().split_whitespace().collect::<Vec<&str>>().join(",")
                    ))
                    .unwrap();
                channel.close().unwrap();
                thread::sleep(time::Duration::from_secs(5));
            }
        }
    }
}

// #[tauri::command(async)]
// fn update_node(node_name: String) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             channel
//                 .exec(&format!(
//                     "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; {node_name} version;"
//                 ))
//                 .unwrap();
//             let mut current_version = String::new();
//             channel.read_to_string(&mut current_version).unwrap();
//             channel.flush().unwrap();
//             println!("{}", current_version);
//             let mut channel1 = my_boxed_session.open_session.channel_session().unwrap();
//             let mut repo = String::new();
//             channel1
//                 .exec(&format!("grep 'REPO=' .bash_profile | sed 's/^.*: //"))
//                 .unwrap();
//             channel1.read_to_string(&mut repo).unwrap();
//             println!("ASDAS {}", repo);
//             // let url = "https://api.github.com/repos/confio/tgrade/releases";
//             // let releases: Vec<Release> = reqwest::get(url).await?.json().await?;
//             // if releases.is_empty() {
//             //     println!("No releases found in the repository.");
//             // } else {
//             //     let latest_stable_release = releases
//             //         .into_iter()
//             //         .find(|release| !release.prerelease);
//             //     match latest_stable_release {
//             //         Some(release) => println!("Latest stable release: {}", release.tag_name),
//             // None => println!("No stable releases found in the repository."),
//         }
//     }
// }

#[tauri::command(async)]
fn node_info(window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel
                .exec(&format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; $(bash -c -l 'echo $EXECUTE') status 2>&1 | jq"))
                .unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            window
                .eval(&*format!("window.updateNodeInfo({})", s))
                .unwrap();
            channel.close().unwrap();
        }
    }
}

// #[tauri::command(async)]
// fn systemctl_statusnode(node_name: String) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             channel
//                 .exec(&format!(
//                     "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; systemctl status {node_name};"
//                 ))
//                 .unwrap();
//             let mut s = String::new();
//             channel.read_to_string(&mut s).unwrap();
//             println!("{}", s);
//             channel.close().unwrap();
//         }
//     }
// }

#[tauri::command(async)]
fn delete_node() {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();

            channel
                .exec(&format!(
                    "bash -c -l \"sudo systemctl stop $EXECUTE; sudo systemctl disable $EXECUTE; sudo rm -rf /etc/systemd/system/$EXECUTE* $(which $EXECUTE) $SYSTEM_FOLDER $HOME/$SYSTEM_FILE* $HOME/$EXECUTE*; sed -i '/EXECUTE/d; /CHAIN_ID/d; /PORT/d; /DENOM/d; /SEEDS/d; /PEERS/d; /VERSION/d; /SYSTEM_FOLDER/d; /PROJECT_FOLDER/d; /GO_VERSION/d; /GENESIS_FILE/d; /ADDRBOOK/d; /MIN_GAS/d; /SEED_MODE/d; /PATH/d; /REPO/d; /MONIKER/d; /SNAPSHOT_URL/d; /WALLET_NAME/d' ~/.bash_profile; source .bash_profile; unset EXECUTE CHAIN_ID PORT DENOM SEEDS PEERS VERSION SYSTEM_FOLDER PROJECT_FOLDER GO_VERSION GENESIS_FILE ADDRBOOK MIN_GAS SEED_MODE PATH REPO MONIKER SNAPSHOT_URL WALLET_NAME\""
                ))
                .unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

// #[tauri::command(async)]
// fn create_validator(
//     amount: String,
//     wallet_name: String,
//     moniker_name: String,
//     password: String,
//     website: String,
//     keybase_id: String,
//     contact: String,
//     com_rate: String,
//     com_max: String,
//     com_ch_rate: String,
//     fees: String,
//     details: String,
// ) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             let mut s = String::new();
//             channel.exec(&format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $(bash -c -l 'echo $EXECUTE') tx staking create-validator --amount={amount}$DENOM --pubkey=$($EXECUTE tendermint show-validator) --moniker={moniker_name}  --chain-id=$CHAIN_ID --commission-rate={com_rate} --commission-max-rate={com_max} --commission-max-change-rate={com_ch_rate} --gas='auto' --gas-prices='{fees}$DENOM' --from={wallet_name} --website={website} --identity={keybase_id} --conta ")).unwrap();
//             channel.read_to_string(&mut s).unwrap();
//             println!("{}", s);
//             channel.close().unwrap();
//         }
//     }
// }

// #[tauri::command(async)]
// fn edit_validator(
//     amount: String,
//     wallet_name: String,
//     moniker_name: String,
//     password: String,
//     website: String,
//     keybase_id: String,
//     contact: String,
//     com_rate: String,
//     com_max: String,
//     com_ch_rate: String,
//     fees: String,
//     details: String,
// ) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             let mut s = String::new();
//             channel.exec(&format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx staking edit-validator --amount={amount}$DENOM --pubkey=$($EXECUTE tendermint show-validator) --moniker={moniker_name}  --chain-id=$CHAIN_ID --commission-rate={com_rate} --commission-max-rate={com_max} --commission-max-change-rate={com_ch_rate} --gas='auto' --gas-prices='{fees}$DENOM' --from={wallet_name} --website={website} --identity={keybase_id} --conta ")).unwrap();
//             channel.read_to_string(&mut s).unwrap();
//             println!("{}", s);
//             channel.close().unwrap();
//         }
//     }
// }

// #[tauri::command(async)]
// fn withdraw_rewards(wallet_name: String, valoper: String, fees: String, password: String) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             channel.exec(&format!(
//                 "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx distribution withdraw-rewards {valoper} --from={wallet_name} --commission --chain-id=$CHAIN_ID;")).unwrap();
//             let mut s = String::new();
//             channel.read_to_string(&mut s).unwrap();
//             println!("{}", s);
//             channel.close().unwrap();
//         }
//     }
// }

// #[tauri::command(async)]
// fn delegate_token(
//     wallet_name: String,
//     valoper: String,
//     password: String,
//     fee: String,
//     amount: String,
// ) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             channel.exec(&format!(
//                 "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx staking delegate {valoper} {amount}$DENOM --from={wallet_name} --chain-id=$CHAIN_ID --gas='auto' --fees={fee}$DENOM ;")).unwrap();
//             let mut s = String::new();
//             channel.read_to_string(&mut s).unwrap();
//             // println!("{}", s);
//             channel.close().unwrap();
//         }
//     }
// }

// #[tauri::command(async)]
// fn redelegate_token(
//     wallet_name: String,
//     first_address: String,
//     destination: String,
//     valoper: String,
//     password: String,
//     fee: String,
//     amount: String,
// ) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             let command: String = format!(
//                 "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx staking rewdelegate {first_address} {destination} {amount}$DENOM --from={wallet_name} --chain-id=$CHAIN_ID --gas='auto' --fees={fee}$DENOM ;");
//             channel.exec(&*command).unwrap();
//             let mut s = String::new();
//             channel.read_to_string(&mut s).unwrap();
//             // println!("{}", s);
//             channel.close().unwrap();
//         }
//     }
// }

// #[tauri::command(async)]
// fn install_node(moniker_name: String, net_name: String, node_name: String) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             let command: String = format!(
//                     "echo 'export MONIKER= {moniker_name}' >> $HOME/.bash_profile; wget -O {node_name}.sh https://node101.io/{net_name}/{node_name}/{node_name}.sh && chmod +x {node_name}.sh && bash {node_name}.sh "
//                 );
//             channel.exec(&*command).unwrap();
//             let mut s = String::new();
//             channel.read_to_string(&mut s).unwrap();
//             if s.contains("SETUP IS FINISHED") {
//                 println!("setup is finished");
//             } else {
//                 println!("setup is not finished");
//             }
//             channel.close().unwrap();
//         }
//     }
// }

#[tauri::command]
fn update_wallet_password(passw: String) {
    unsafe {
        GLOBAL_STRUCT.as_mut().unwrap().walletpassword = passw.to_string();
    }
}

#[tauri::command(async)]
fn create_wallet(walletname: String, window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            channel
                .exec(&*format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; echo -e '{}\ny\n' | $(bash -c -l 'echo $EXECUTE') keys add {} --output json;",
                    my_boxed_session.walletpassword, walletname
                ))
                .unwrap();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            let v: Value = serde_json::from_str(&s).unwrap();
            window
                .eval(&format!(
                    "window.showCreatedWallet('{}')",
                    v["mnemonic"].to_string()
                ))
                .unwrap();
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn if_wallet_exists(walletname: String) -> bool {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            // let command: String = format!(
            //     "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; echo -e {} | {} keys list --output json;",
            //     GLOBAL_STRUCT.as_mut().unwrap().walletpassword,
            //     GLOBAL_STRUCT.as_mut().unwrap().existing_node
            // );
            // channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            let v: Value = serde_json::from_str(&s).unwrap();
            let mut is_exist = false;
            for i in v.as_array().unwrap() {
                if i["name"].to_string() == format!("\"{}\"", walletname) {
                    is_exist = true;
                }
            }
            if is_exist {
                println!("wallet exists");
            } else {
                println!("wallet does not exist");
            }
            channel.close().unwrap();
            is_exist
        } else {
            false
        }
    }
}

#[tauri::command(async)]
fn show_wallets(window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            // let command: String = format!(
            //     "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{}\" | {} keys list --output json;",
            //     GLOBAL_STRUCT.as_mut().unwrap().walletpassword,
            //     GLOBAL_STRUCT.as_mut().unwrap().existing_node
            // );
            // channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            window.eval(&format!("window.showWallets({})", s)).unwrap();
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn delete_wallet(walletname: String) -> () {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            // let command: String = format!(
            //         "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{}\" | {} keys delete {} -y --output json;", GLOBAL_STRUCT.as_mut().unwrap().walletpassword, GLOBAL_STRUCT.as_mut().unwrap().existing_node, walletname
            //     );
            // channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn start_stop_restart_node(action: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!("systemctl {action} $(bash -c -l 'echo $EXECUTE')");
            channel.exec(&*command).unwrap();
            channel.close().unwrap();
        }
    }
}

// #[tauri::command(async)]
// fn unjail(password: String, fees: String) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             // let nd = &my_boxed_session.existing_node;
//             // let command: String = format!(
//             //     "yes \"{password}\" | export PATH=$PATH:/usr/local/go/bin:/root/go/bin; {nd} tx slashing unjail  --broadcast-mode=block --from=$WALLET_NAME --chain-id=$CHAIN_ID --gas=auto --fees {fees}$DENOM"
//             // );
//             // channel.exec(&command).unwrap();
//             let mut s = String::new();
//             channel.read_to_string(&mut s).unwrap();
//             println!("{}", s);
//             println!("Will return mnemonics if created first, if not then will return a success or anything.");
//             channel.close().unwrap();
//         }
//     }
// }

#[tauri::command(async)]
fn recover_wallet(walletname: String, mnemo: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            // channel
            //     .exec(&*format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; echo -e '{}\n{}' | {} keys add {} --recover --output json;",
            //         my_boxed_session.walletpassword,
            //         mnemo,
            //         my_boxed_session.existing_node,
            //         walletname
            //     ))
            //     .unwrap();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

// #[tauri::command(async)]
// fn vote(wallet_name: String, password: String, proposal_num: String, option: String) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             let command: String = format!("yes \"{password}\" $EXECUTE tx gov vote {proposal_num} {option} --from {wallet_name} --chain-id=$CHAIN_ID -y");
//             channel.exec(&command).unwrap();
//             let mut s = String::new();
//             channel.read_to_string(&mut s).unwrap();
//             println!("{}", s);
//             channel.close().unwrap();
//         }
//     }
// }

// #[tauri::command(async)]
// fn send_token(wallet_name: String, receiver_address: String, amount: String, password: String) {
//     unsafe {
//         if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
//             let mut channel = my_boxed_session.open_session.channel_session().unwrap();
//             let command: String = format!("yes \"{password}\" $EXECUTE tx bank send {wallet_name} {receiver_address} {amount}$DENOM -y");
//             channel.exec(&command).unwrap();
//             let mut s = String::new();
//             channel.read_to_string(&mut s).unwrap();
//             println!("{}", s);
//             channel.close().unwrap();
//         }
//     }
// }

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
            log_out,
            cpu_mem_sync,
            cpu_mem_sync_stop,
            node_info,
            // install_node,
            // unjail,
            create_wallet,
            show_wallets,
            delete_wallet,
            start_stop_restart_node,
            // systemctl_statusnode,
            delete_node,
            // update_node,
            update_wallet_password,
            // send_token,
            recover_wallet,
            // vote,
            if_wallet_exists
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
