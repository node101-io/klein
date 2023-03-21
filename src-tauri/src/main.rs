#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde_json::{self, Value};
use ssh2::{DisconnectCode, Session};
use std::{
    fs::File,
    io::{self, BufRead, Read, Write},
    path::Path,
    thread, time,
};
use tauri::{LogicalSize, Manager};

struct SessionManager {
    open_session: Session,
    stop_cpu_mem: bool,
    existing_node: String,
    walletpassword: String,
}

static mut GLOBAL_STRUCT: Option<SessionManager> = None;

async fn create_session(session: Session) -> SessionManager {
    let alive_session = SessionManager {
        open_session: session,
        stop_cpu_mem: false,
        existing_node: String::new(),
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

    if res.is_ok() {
        unsafe {
            GLOBAL_STRUCT = Some(create_session(sess).await);
            current_node().await;
            println!("{}", GLOBAL_STRUCT.as_mut().unwrap().existing_node);
            let func = format!(
                "window.loadNewPage('manage-node/manage-node.html', {}, '{}')",
                remember,
                GLOBAL_STRUCT.as_mut().unwrap().existing_node
            );
            window.eval(&func).unwrap();
            cpu_mem(window.clone()).await;
        }
    } else {
        window.eval("window.showLoginError()").unwrap();
    }
}

#[tauri::command(async)]
fn log_out(window: tauri::Window) {
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

            GLOBAL_STRUCT = None;
            window.eval("window.loadNewPage('../index.html')").unwrap();
        }
    }
}

// INFORMATIN ABOUT SERVER & NODE.
fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where
    P: AsRef<Path>,
{
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

#[tauri::command(async)]
fn cpu_mem_stop(a: bool) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            my_boxed_session.stop_cpu_mem = a;
        }
    }
}

#[tauri::command(async)]
async fn cpu_mem(window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            loop {
                // let mut channel = my_boxed_session.open_session.channel_session().unwrap();

                let channel_result = my_boxed_session.open_session.channel_session();
                let mut channel = match channel_result {
                    Ok(channel) => channel,
                    Err(err) => {
                        println!("Error opening channel: {}", err);
                        cpu_mem(window.clone());
                        return;
                    }
                };

                if my_boxed_session.stop_cpu_mem {
                    break;
                }

                let mut s = String::new();
                channel
                        .exec(
                            "echo $(top -b -n1 | awk '/Cpu\\(s\\)/{print 100-$8} /MiB Mem/{print ($4-$6)/$4*100}')"
                        )
                        .unwrap();
                channel.read_to_string(&mut s).unwrap();

                println!("{}", s);
                let func = format!(
                    "window.updateCpuMem({});",
                    s.trim().split_whitespace().collect::<Vec<&str>>().join(",")
                );
                window.eval(&func).unwrap();
                channel.close().unwrap();

                thread::sleep(time::Duration::from_secs(5));
            }
        }
    }
}

#[tauri::command]
async fn current_node() {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut file = File::open("../cosmos.txt").unwrap();
            let mut contents = String::new();
            file.read_to_string(&mut contents).unwrap();
            let mut command = String::from("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; ");
            if let Ok(lines) = read_lines("../cosmos.txt") {
                for line in lines {
                    if line.as_ref().unwrap() == "Tgrade" {
                        command = command
                            + &String::from("which ")
                            + &String::from(line.unwrap().to_lowercase() + "; ");
                    } else {
                        command = command
                            + &String::from("which ")
                            + &String::from(line.unwrap().to_lowercase() + "d; ");
                    }
                }
                let stringified: &str = &*command;
                channel.exec(stringified).unwrap();
                let mut s = String::new();
                channel.read_to_string(&mut s).unwrap();
                let vec: Vec<&str> = s.split("/").collect();
                let x = *vec.last().unwrap();
                GLOBAL_STRUCT.as_mut().unwrap().existing_node = x.trim().to_string();
            }
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn update_node(node_name: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command =
                format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; {node_name} version;");
            channel.exec(&command).unwrap();
            let mut current_version = String::new();
            channel.read_to_string(&mut current_version).unwrap();
            channel.flush().unwrap();
            println!("{}", current_version);
            let mut channel1 = my_boxed_session.open_session.channel_session().unwrap();
            let command1 = format!("grep 'REPO=' .bash_profile | sed 's/^.*: //");
            let mut repo = String::new();
            channel1.exec(&command1).unwrap();
            channel1.read_to_string(&mut repo).unwrap();

            println!("ASDAS {}", repo);

            // let url = "https://api.github.com/repos/confio/tgrade/releases";
            // let releases: Vec<Release> = reqwest::get(url).await?.json().await?;

            // if releases.is_empty() {
            //     println!("No releases found in the repository.");
            // } else {
            //     let latest_stable_release = releases
            //         .into_iter()
            //         .find(|release| !release.prerelease);

            //     match latest_stable_release {
            //         Some(release) => println!("Latest stable release: {}", release.tag_name),
            // None => println!("No stable releases found in the repository."),
        }
    }
}

#[tauri::command(async)]
fn node_info(node_name: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command =
                format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; {node_name} status");
            channel.exec(&command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn systemctl_statusnode(node_name: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command = format!(
                "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; systemctl status {node_name}; echo hey;"
            );
            channel.exec(&command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn remove_node() {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let node_name = String::from(my_boxed_session.existing_node.clone());
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                "
                sudo systemctl stop $EXECUTE;
                sudo systemctl disable $EXECUTE;
                sudo rm /etc/systemd/system/$EXECUTE* -rf;
                sudo rm $(which $EXECUTE) -rf;
                sudo rm -rf $SYSTEM_FOLDER;
                sudo rm $HOME/$SYSTEM_FİLE* -rf;
                sudo rm $HOME/$EXECUTE* -rf;
                sed -i '/EXECUTE/d' ~/.bash_profile;
                sed -i '/CHAIN_ID/d' ~/.bash_profile;
                sed -i '/PORT/d' ~/.bash_profile;
                sed -i '/DENOM/d' ~/.bash_profile;
                sed -i '/SEEDS/d' ~/.bash_profile;
                sed -i '/PEERS/d' ~/.bash_profile;
                sed -i '/VERSION/d' ~/.bash_profile;
                sed -i '/SYSTEM_FOLDER/d' ~/.bash_profile;
                sed -i '/PROJECT_FOLDER/d' ~/.bash_profile;
                sed -i '/GO_VERSION/d' ~/.bash_profile;
                sed -i '/GENESIS_FILE/d' ~/.bash_profile;
                sed -i '/ADDRBOOK/d' ~/.bash_profile;
                sed -i '/MIN_GAS/d' ~/.bash_profile;
                sed -i '/SEED_MODE/d' ~/.bash_profile;
                sed -i '/PATH/d' ~/.bash_profile;
                sed -i '/REPO/d' ~/.bash_profile;
                sed -i '/MONIKER/d' ~/.bash_profile;
                sed -i '/SNAPSHOT_URL/d' ~/.bash_profile;
                sed -i '/WALLET_NAME/d' ~/.bash_profile;
                source .bash_profile;
                "
            );

            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            let condition = format!("/{node_name}");
            if s.contains(&condition) {
                println!("{}", s);
                print!("Problem deleting node.");
            } else {
                println!("{}", s);
                print!("Node deleted successfully.");
            }
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn create_validator(
    amount: String,
    wallet_name: String,
    moniker_name: String,
    password: String,
    website: String,
    keybase_id: String,
    contact: String,
    com_rate: String,
    com_max: String,
    com_ch_rate: String,
    fees: String,
    details: String,
) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            let command: String =
                format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx staking create-validator --amount={amount}$DENOM --pubkey=$($EXECUTE tendermint show-validator) --moniker={moniker_name}  --chain-id=$CHAIN_ID --commission-rate={com_rate} --commission-max-rate={com_max} --commission-max-change-rate={com_ch_rate} --gas='auto' --gas-prices='{fees}$DENOM' --from={wallet_name} --website={website} --identity={keybase_id} --conta ");
            channel.exec(&*command).unwrap();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

//TAKE ALL COMMAND FROM JS
#[tauri::command(async)]
fn edit_validator(
    amount: String,
    wallet_name: String,
    moniker_name: String,
    password: String,
    website: String,
    keybase_id: String,
    contact: String,
    com_rate: String,
    com_max: String,
    com_ch_rate: String,
    fees: String,
    details: String,
) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            let command: String =
                format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx staking edit-validator --amount={amount}$DENOM --pubkey=$($EXECUTE tendermint show-validator) --moniker={moniker_name}  --chain-id=$CHAIN_ID --commission-rate={com_rate} --commission-max-rate={com_max} --commission-max-change-rate={com_ch_rate} --gas='auto' --gas-prices='{fees}$DENOM' --from={wallet_name} --website={website} --identity={keybase_id} --conta ");
            channel.exec(&*command).unwrap();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn withdraw_rewards(wallet_name: String, valoper: String, fees: String, password: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx distribution withdraw-rewards {valoper} --from={wallet_name} --commission --chain-id=$CHAIN_ID;");
            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn delegate_token(
    wallet_name: String,
    valoper: String,
    password: String,
    fee: String,
    amount: String,
) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx staking delegate {valoper} {amount}$DENOM --from={wallet_name} --chain-id=$CHAIN_ID --gas='auto' --fees={fee}$DENOM ;");
            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            // println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn redelegate_token(
    wallet_name: String,
    first_address: String,
    destination: String,
    valoper: String,
    password: String,
    fee: String,
    amount: String,
) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | $EXECUTE tx staking rewdelegate {first_address} {destination} {amount}$DENOM --from={wallet_name} --chain-id=$CHAIN_ID --gas='auto' --fees={fee}$DENOM ;");
            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            // println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn install_node(moniker_name: String, net_name: String, node_name: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                    "echo 'export MONIKER= {moniker_name}' >> $HOME/.bash_profile; wget -O {node_name}.sh https://node101.io/{net_name}/{node_name}/{node_name}.sh && chmod +x {node_name}.sh && bash {node_name}.sh "
                );
            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            if s.contains("SETUP IS FINISHED") {
                println!("setup is finished");
            } else {
                println!("setup is not finished");
            }
            channel.close().unwrap();
        }
    }
}

#[tauri::command]
fn update_wallet_password(passw: String) {
    unsafe {
        GLOBAL_STRUCT.as_mut().unwrap().walletpassword = passw.to_string();
    }
}

//Should give first wallet's password if created before.
#[tauri::command(async)]
fn create_wallet(walletname: String, window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            channel
                .exec(&*format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; echo -e '{}\ny\n' | {} keys add {} --output json;",
                my_boxed_session.walletpassword,
                GLOBAL_STRUCT.as_mut().unwrap().existing_node, walletname))
                .unwrap();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            let v: Value = serde_json::from_str(&s).unwrap();
            let func = format!("window.showCreatedWallet('{}')", v["mnemonic"].to_string());
            window.eval(&func).unwrap();
            channel.close().unwrap();
        }
    }
}

// export PATH=$PATH:/usr/local/go/bin:/root/go/bin; " + command
#[tauri::command(async)]
fn show_wallets(window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{}\" | {} keys list --output json;",
                GLOBAL_STRUCT.as_mut().unwrap().walletpassword,
                GLOBAL_STRUCT.as_mut().unwrap().existing_node
            );
            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            window.eval(&format!("window.showWallets({})", s)).unwrap();
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn delete_wallet(walletname: String, window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                    "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{}\" | {} keys delete {} -y --output json;", GLOBAL_STRUCT.as_mut().unwrap().walletpassword, GLOBAL_STRUCT.as_mut().unwrap().existing_node, walletname
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
fn start_node() -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let nd = &my_boxed_session.existing_node;
            let command: String =
                format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; systemctl start {nd}");
            channel.exec(&*command).unwrap();
            channel.close().unwrap();
            String::from("Node started successfully.")
        } else {
            String::from("Problem")
        }
    }
}

#[tauri::command(async)]
fn stop_node() -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let nd = &my_boxed_session.existing_node;
            let command: String =
                format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; systemctl stop {nd}");
            channel.exec(&*command).unwrap();
            channel.close().unwrap();
            String::from("Node stopped successfully.")
        } else {
            String::from("Problem")
        }
    }
}

#[tauri::command(async)]
fn restart_node() {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let nd = &my_boxed_session.existing_node;
            let command: String =
                format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; systemctl restart {nd}");
            channel.exec(&*command).unwrap();
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn unjail(password: String, fees: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let nd = &my_boxed_session.existing_node;
            let command: String = format!(
                "yes \"{password}\" | export PATH=$PATH:/usr/local/go/bin:/root/go/bin; {nd} tx slashing unjail  --broadcast-mode=block --from=$WALLET_NAME --chain-id=$CHAIN_ID --gas=auto --fees {fees}$DENOM"
            );
            channel.exec(&command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            println!("Will return mnemonics if created first, if not then will return a success or anything.");
            channel.close().unwrap();
        }
    }
}

#[tauri::command]
async fn recover_wallet(walletname: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            let mnemo= String::from("faith sight runway armor glare fame manage simple way palm stick entire organ october jazz reward pony lizard burst legal inch broccoli purchase blind");
            channel
                .exec(&*format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; echo -e '{}\ny\n{}' | {} keys add {} --recover --output json;",
                    my_boxed_session.walletpassword,
                    mnemo,
                    my_boxed_session.existing_node,
                    walletname
                ))
                .unwrap();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn vote(wallet_name: String, password: String, proposal_num: String, option: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();

            let command: String = format!("yes \"{password}\" $EXECUTE tx gov vote {proposal_num} {option} --from {wallet_name} --chain-id=$CHAIN_ID -y");
            channel.exec(&command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
    }
}

#[tauri::command(async)]
fn send_token(wallet_name: String, receiver_address: String, amount: String, password: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!("yes \"{password}\" $EXECUTE tx bank send {wallet_name} {receiver_address} {amount}$DENOM -y");
            channel.exec(&command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            channel.close().unwrap();
        }
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
            log_out,
            cpu_mem,
            cpu_mem_stop,
            node_info,
            current_node,
            install_node,
            unjail,
            create_wallet,
            show_wallets,
            delete_wallet,
            start_node,
            stop_node,
            restart_node,
            systemctl_statusnode,
            remove_node,
            update_node,
            update_wallet_password,
            send_token,
            recover_wallet,
            vote
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
