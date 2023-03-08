#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use ssh2::{ Session, DisconnectCode };

use std::{ io::{ Read, Write } };
// use std::io::{Read, Write};
use tauri::{ Manager, LogicalSize, Position };
use std::fs::File;
use std::io::{ self, BufRead };
use std::path::Path;

//SESSION OPERATIONS
struct SessionManager {
    open_session: Session,
}

static mut GLOBAL_STRUCT: Option<Box<SessionManager>> = None;

fn create_session(session: Session) -> Box<SessionManager> {
    let mut alive_session = SessionManager {
        open_session: session,
    };
    Box::new(alive_session)
}

// DON'T KNOW IF THAT WILL BE NECESSARY.
// fn modify_session(session:Session,manager: &mut SessionManager) {
//     manager.open_session = session;
// }

// LOGIN --- LOGOUT FUNCTUONS
#[tauri::command]
async fn log_in(ip: String, password: String, remember: bool, window: tauri::Window) -> () {
    let tcp = std::net::TcpStream::connect(format!("{}:22", ip)).unwrap();
    tcp.set_read_timeout(Some(std::time::Duration::from_secs(1))).unwrap();
    let mut sess = Session::new().unwrap();
    sess.set_tcp_stream(tcp);
    sess.handshake().unwrap();
    let res = sess.userauth_password("root", &password);
    println!("arrived here,");
    println!("{}", res.is_ok());
    if res.is_ok() {
        unsafe {
            GLOBAL_STRUCT = Some(create_session(sess));
            let mut channel = GLOBAL_STRUCT.as_ref()
                .unwrap()
                .open_session.channel_session()
                .unwrap();

            channel.exec("ls").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            print!("{}", s);
            if remember {
                println!("Remembering password");
            }
        }
        window
            .eval(&format!(r#"window['loadNewPage']('manage-node/manage-node.html',{})"#, remember))
            .unwrap();
        ()
    } else {
        window.eval("window['showLoginError']()").unwrap();
        ()
    }
}

#[tauri::command]
async fn log_out(window: tauri::Window) {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = (*my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("ls").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            print!("{}", s);
            println!("hey");
            (*my_boxed_session).open_session
                .disconnect(
                    Some(DisconnectCode::AuthCancelledByUser),
                    "Disconnecting from server",
                    None
                )
                .unwrap();
            GLOBAL_STRUCT = None;
            window.eval("window['loadNewPage']('../index.html')").unwrap();
        }
    }
}

// INFORMATIN ABOUT SERVER & NODE.
fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>> where P: AsRef<Path> {
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

#[tauri::command]
async fn cpu_mem() -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel
                .exec(
                    "free | grep Mem | awk '{print $3/$2 * 100.0}' ; ps aux --sort -%cpu | head -10 | awk '{ total += $3} END {print total}'"
                )
                .unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            s
        } else {
            println!("!");
            String::from("!")
        }
    }
}

#[tauri::command]
async fn current_node(window: tauri::Window) -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            let mut file = File::open("../cosmos.txt").unwrap();
            let mut contents = String::new();
            file.read_to_string(&mut contents).unwrap();
            let mut command = String::from("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; ");
            if let Ok(lines) = read_lines("../cosmos.txt") {
                for line in lines {
                    if line.as_ref().unwrap() == "Tgrade" {
                        command =
                            command +
                            &String::from("which ") +
                            &String::from(line.unwrap().to_lowercase() + "; ");
                    } else {
                        command =
                            command +
                            &String::from("which ") +
                            &String::from(line.unwrap().to_lowercase() + "d; ");
                    }
                }
                let stringified: &str = &*command;
                // println!("{}",stringified);
                channel.exec(stringified).unwrap();
                let mut s = String::new();
                channel.read_to_string(&mut s).unwrap();

                if s.len() == 0 {
                    println!("probably nothing is installed.");
                    String::from("Nothing is installed right now.")
                } else {
                    let vec: Vec<&str> = s.split("/").collect();
                    let x = *vec.last().unwrap();
                    println!("{}", x);
                    String::from(x)
                }
            } else {
                String::from("Problem reading lines")
            }
        } else {
            String::from("Session not found")
        }
    }
}

#[tauri::command]
async fn node_info() -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel.exec("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; lavad status").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            s
        } else {
            println!("OPS!");
            String::from("couldn't get")
        }
    }
}

#[tauri::command]
async fn am_i_logged_out() {
    unsafe {
        if GLOBAL_STRUCT.is_none() {
            println!("Logged out successfully.");
        } else {
            println!("You're still logged in.");
        }
    }
}

#[tauri::command]
async fn remove_node(node_name: String, window: tauri::Window) -> String {
    unsafe {
        if GLOBAL_STRUCT.is_some() {
            if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
                let mut channel = my_boxed_session.open_session.channel_session().unwrap();
                println!("arrived here.");
                let command: String = format!("rm -rf $");
                channel.exec(&*command).unwrap();
                let mut s = String::new();
                channel.read_to_string(&mut s).unwrap();
                if s.contains("SETUP IS FINISHED") {
                    println!("{}", s);
                    String::from("Successful.")
                } else {
                    String::from("A problem has occurred while installing the node.")
                }
            } else {
                String::from("Problem finding session")
            }
        } else {
            String::from("There is not active session!")
        }
    }
}

#[tauri::command]
async fn create_validator(
    amount: String,
    wallet_name: String,
    moniker_name: String,
    website: String,
    password: String,
    contact: String,
    keybase_id: String,
    com_rate: String,
    fees: String,
    details: String
) -> Result<String, String> {
    Ok("Will create a validator".into())
}

#[tauri::command]
async fn edit_validator(
    wallet_name: String,
    new_moniker_name: String,
    website: String,
    password: String,
    contact: String,
    keybase_id: String,
    com_rate: String,
    details: String
) -> Result<String, String> {
    Ok("Will edit a validator".into())
}

#[tauri::command]
async fn withdraw_reward(
    wallet_name: String,
    fees: String,
    password: String
) -> Result<String, String> {
    Ok("Will withdraw stuff.".into())
}

#[tauri::command]
async fn delegate_token(
    wallet_name: String,
    valoper: String,
    password: String,
    fees: String
) -> Result<String, String> {
    Ok("Will delegate stuff.".into())
}

#[tauri::command]
async fn redelegate_token(
    wallet_name: String,
    destination_address: String,
    password: String,
    fees: String,
    first_validator: String
) -> Result<String, String> {
    Ok("Will redelegate stuff.".into())
}

#[tauri::command]
async fn install_node(moniker_name: String, node_name: String, window: tauri::Window) -> String {
    unsafe {
        if GLOBAL_STRUCT.is_some() {
            if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
                let mut channel = my_boxed_session.open_session.channel_session().unwrap();
                println!("arrived here.");
                let command: String = format!(
                    "echo 'export MONIKER= {moniker_name}' >> $HOME/.bash_profile; wget -O lava.sh https://node101.io/testnet/lava/lava.sh && chmod +x lava.sh && bash lava.sh "
                );
                channel.exec(&*command).unwrap();
                let mut s = String::new();
                channel.read_to_string(&mut s).unwrap();
                if s.contains("SETUP IS FINISHED") {
                    println!("{}", s);
                    String::from("Successful.")
                } else {
                    String::from("A problem has occurred while installing the node.")
                }
            } else {
                String::from("Problem finding session")
            }
        } else {
            String::from("There is not active session!")
        }
    }
}

//Should give first wallet's password if created before.
#[tauri::command]
async fn create_wallet(wallet_name: String, password: String) -> String {
    unsafe {
        if GLOBAL_STRUCT.is_some() {
            if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
                let mut channel = my_boxed_session.open_session.channel_session().unwrap();
                channel.shell().unwrap();
                let mut stream = channel.stream(0);

                stream.write_all(b"tgrade keys add something \n").unwrap();
                stream.write_all(b"node101bos\n").unwrap();
                stream.write_all(b"node101bos\n").unwrap();
                stream.flush().unwrap();
                String::from("NICE")
            } else {
                String::from("ah fuck")
            }
        } else {
            String::from("No session found.")
        }
    }

    // export PATH=$PATH:/usr/local/go/bin:/root/go/bin; " + command
}
#[tauri::command]
async fn show_wallets() -> String {
    unsafe {
        if GLOBAL_STRUCT.is_some() {
            if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
                let mut channel = my_boxed_session.open_session.channel_session().unwrap();
                println!("arrived here.");
                let command: String = format!(
                    "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; lavad keys list --output json;"
                );
                channel.exec(&*command).unwrap();
                let mut s = String::new();
                channel.read_to_string(&mut s).unwrap();
                println!("{}", s);
                String::from(s)
            } else {
                String::from("Problem")
            }
        } else {
            String::from("No session found.")
        }
    }
}

#[tauri::command]
async fn delete_wallets(wallet_name: String) -> String {
    unsafe {
        if GLOBAL_STRUCT.is_some() {
            if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
                let mut channel = my_boxed_session.open_session.channel_session().unwrap();
                println!("arrived here.");
                let command: String = format!(
                    "export PATH=$PATH:/usr/local/go/bin:/root/go/bin; lavad keys delete {wallet_name} --output json;"
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
        } else {
            String::from("No session found.")
        }
    }
}

// #[tauri::command]
// async fn recover_wallet(wallet_name:String,password:String) -> Result<String,String> {
//     Ok(("stuff"))
// }

#[tauri::command]
async fn add_wallet(wallet_name: String, password: String) -> Result<String, String> {
    Ok("Will add new wallet, return name or stuff.".into())
}

#[tauri::command]
async fn vote(
    wallet_name: String,
    proposoal_num: String,
    mnemonic: String,
    option: String
) -> Result<String, String> {
    Ok("Should print result, in a json if possible.".into())
}

#[tauri::command]
async fn unjail(node_name: String, wallet_name: String, password: String, fees: String) -> String {
    unsafe {
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref() {
            let mut channel = my_boxed_session.open_session.channel_session().unwrap();
            channel
                .exec(
                    r"{node_name} tx slashing unjail \
                            --broadcast-mode=block \
                            --from=$WALLET_NAME \
                            --chain-id=$CHAIN_ID \        
                            --gas=auto --fees 250ulyl"
                )
                .unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}", s);
            return s;
        }

        String::from(
            "Will return mnemonics if created first, if not then will return a success or anything."
        )
    }
}

#[tauri::command]
async fn send_token(
    wallet_name: String,
    receiver_address: String,
    amount: String,
    password: String
) -> Result<String, String> {
    Ok("Will send token".into())
}

fn main() {
    tauri::Builder
        ::default()
        .setup(|app| {
            app.get_window("main")
                .unwrap()
                .set_min_size(Some(LogicalSize::new(1280, 720)))
                .unwrap();
            app.get_window("main").unwrap().center().unwrap();
            Ok(())
        })
        .invoke_handler(
            tauri::generate_handler![
                log_in,
                log_out,
                cpu_mem,
                node_info,
                am_i_logged_out,
                current_node,
                install_node,
                unjail,
                create_wallet,
                show_wallets,
                delete_wallets
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}