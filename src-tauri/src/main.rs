#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use ssh2::{Session};
// use ssh2::{Session, Channel};
use std::io::{Read};
// use std::io::{Read, Write};
use tauri::{PhysicalSize, Manager};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app.get_window("main").unwrap().set_min_size(Some(PhysicalSize::new(1280, 720))).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![log_in])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn log_in(ip: String, password: String, window: tauri::Window) -> () {
    let tcp = std::net::TcpStream::connect(format!("{}:22", ip)).unwrap();
    let mut sess = Session::new().unwrap();
    sess.set_tcp_stream(tcp);
    sess.handshake().unwrap();
    sess.userauth_password("root", &password).unwrap();

    let mut channel = sess.channel_session().unwrap();
    channel.exec("ls").unwrap();
    let mut s = String::new();
    channel.read_to_string(&mut s).unwrap();
    print!("{}", s);

    window.eval("window['loadNewPage']('mainpage/mainpage')").unwrap();
}

// #[tauri::command]
// async fn log_in(ip: String, password: String, window: tauri::Window) -> Result<(), String> {
//     let tcp = match std::net::TcpStream::connect(format!("{}:22", ip)) {
//         Ok(tcp) => tcp,
//         Err(e) => return Err(format!("Failed to connect to {}: {}", ip, e)),
//     };
    
//     let mut sess = match Session::new() {
//         Ok(sess) => sess,
//         Err(e) => return Err(format!("Failed to create SSH session: {}", e)),
//     };
    
//     sess.set_tcp_stream(tcp);
    
//     if let Err(e) = sess.handshake() {
//         return Err(format!("Failed to perform SSH handshake: {}", e));
//     }
    
//     if let Err(e) = sess.userauth_password("root", &password) {
//         return Err(format!("Failed to authenticate with remote machine: {}", e));
//     }
    
//     let mut channel = match sess.channel_session() {
//         Ok(channel) => channel,
//         Err(e) => return Err(format!("Failed to open SSH channel: {}", e)),
//     };
    
//     if let Err(e) = channel.exec("ls") {
//         return Err(format!("Failed to execute command on remote machine: {}", e));
//     }
    
//     let mut s = String::new();
//     if let Err(e) = channel.read_to_string(&mut s) {
//         return Err(format!("Failed to read output from remote machine: {}", e));
//     }
    
//     if let Err(e) = window.eval("window['loadNewPage']('newpage')") {
//         return Err(format!("Failed to execute JavaScript on Tauri window: {}", e));
//     }
    
//     Ok(())
// }
