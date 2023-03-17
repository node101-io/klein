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
}

static mut GLOBAL_STRUCT: Option<SessionManager> = None;

async fn create_session(session: Session) -> SessionManager {
    let alive_session = SessionManager {
        open_session: session,
        stop_cpu_mem: false,
        existing_node: String::new(),
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
                "window['loadNewPage']('manage-node/manage-node.html', {}, '{}')",
                remember,
                GLOBAL_STRUCT.as_mut().unwrap().existing_node
            );
            window.eval(&func).unwrap();
            cpu_mem(window.clone()).await;
        }
    } else {
        window.eval("window['showLoginError']()").unwrap();
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
            window
                .eval("window['loadNewPage']('../index.html')")
                .unwrap();
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
        println!("cpu mem.");
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            loop {
                let mut channel = my_boxed_session.open_session.channel_session().unwrap();

                my_boxed_session.stop_cpu_mem = false;
                println!("{:?}", my_boxed_session.stop_cpu_mem);
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

                thread::sleep(time::Duration::from_secs(15));
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
        }
    }
}

#[tauri::command(async)]
fn remove_node(node_name: String) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
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
        }
    }
}

// #[tauri::command(async)]
// fn create_validator(
//     amount: String,
//     wallet_name: String,
//     moniker_name: String,
//     website: String,
//     password: String,
//     contact: String,
//     keybase_id: String,
//     com_rate: String,
//     fees: String,
//     details: String,
// ) -> Result<String, String> {
//     Ok("Will create a validator".into())
// }

// #[tauri::command(async)]
// fn edit_validator(
//     wallet_name: String,
//     new_moniker_name: String,
//     website: String,
//     password: String,
//     contact: String,
//     keybase_id: String,
//     com_rate: String,
//     details: String,
// ) -> Result<String, String> {
//     Ok("Will edit a validator".into())
// }

// #[tauri::command(async)]
// fn withdraw_rewards(wallet_name: String, fees: String, password: String) -> Result<String, String> {
//     Ok("Will withdraw stuff.".into())
// }

// #[tauri::command(async)]
// fn delegate_token(
//     wallet_name: String,
//     valoper: String,
//     password: String,
//     fees: String,
// ) -> Result<String, String> {
//     Ok("Will delegate stuff.".into())
// }

// #[tauri::command(async)]
// fn redelegate_token(
//     wallet_name: String,
//     destination_address: String,
//     password: String,
//     fees: String,
//     first_validator: String,
// ) -> Result<String, String> {
//     Ok("Will redelegate stuff.".into())
// }

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
        }
    }
}

//Should give first wallet's password if created before.
#[tauri::command(async)]
fn create_wallet(walletname: String, password: String, window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut s = String::new();
            // print the parameters
            println!("walletname: {} password: {}", walletname, password);
            channel
                // .exec(
                //     "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"password\" | tgrade keys add walletname --output json"
                // )
                // use parameters
                .exec(&*format!(
                            "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; yes \"{password}\" | lavad keys add {walletname} --output json", // TODO: PASSWORD MAY INCLUDE \ AND SHOULD BE HANDLED
                        ))
                .unwrap();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            // parse as json and get the address
            let v: Value = serde_json::from_str(&s).unwrap();
            println!("{}", v["address"].to_string());

            let func = format!(
                "window['showCreatedWallet']('{}', '{}', '{}')",
                v["name"].to_string(),
                v["address"].to_string(),
                v["mnemonic"].to_string()
            );
            window.eval(&func).unwrap();
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
                "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; lavad keys list --output json;"
            );
            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            // println!("{}", s);
            window.eval(&format!("window['showWallets']({})", s)).unwrap();
        }
    }
}

#[tauri::command(async)]
fn delete_wallet(walletname: String) -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let command: String = format!(
                    "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; lavad keys delete {walletname} --output json;"
                );
            channel.exec(&*command).unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            if s.contains(":") {
                channel.exec("y").unwrap();
                channel.read_to_string(&mut s).unwrap();
            }
            println!("{}", s);
            String::from(s)
        } else {
            String::from("Problem")
        }
    }
}

// #[tauri::command]
// async fn recover_wallet(wallet_name:String,password:String) -> Result<String,String> {
//     Ok(("stuff"))
// }

// #[tauri::command(async)]
// fn vote(
//     wallet_name: String,
//     proposoal_num: String,
//     mnemonic: String,
//     option: String,
// ) -> Result<String, String> {
//     Ok("Should print result, in a json if possible.".into())
// }

#[tauri::command(async)]
fn start_node() -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_mut() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let nd = &my_boxed_session.existing_node;
            let command: String =
                format!("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; systemctl start {nd}");
            channel.exec(&*command).unwrap();
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
        }
    }
}

// #[tauri::command(async)]
// fn send_token(
//     wallet_name: String,
//     receiver_address: String,
//     amount: String,
//     password: String,
// ) -> Result<String, String> {
//     Ok("Will send token".into())
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
            update_node
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
