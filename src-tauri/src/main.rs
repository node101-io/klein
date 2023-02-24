#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use ssh2::{Session};
// use ssh2::{Session, Channel};
use std::io::{Read};
// use std::io::{Read, Write};
use tauri::{PhysicalSize, Manager};

struct SessionManager{
    open_session: Session,
}

static mut GLOBAL_STRUCT: Option<Box<SessionManager>> = None;

fn create_session(session: Session) -> Box<SessionManager>{
    let mut alive_session = SessionManager{
        open_session:session,
    };  
    Box::new(alive_session)
}

fn modify_session(session:Session,manager: &mut SessionManager) {
    manager.open_session = session;
}


#[tauri::command]
async fn log_in(ip: String, password: String, remember: bool, window: tauri::Window) -> () {
    let tcp = std::net::TcpStream::connect(format!("{}:22", ip)).unwrap();
    let mut sess = Session::new().unwrap();
    sess.set_tcp_stream(tcp);
    sess.handshake().unwrap();
    let res = sess.userauth_password("root", &password);
    println!("arrived here,");
    println!("{}",res.is_ok());

    if res.is_ok(){
        unsafe{
        GLOBAL_STRUCT = Some(create_session(sess));
        let mut x = (GLOBAL_STRUCT.as_ref().unwrap()).open_session.channel_session().unwrap();

        x.exec("ls").unwrap();
        let mut s = String::new();
        x.read_to_string(&mut s).unwrap();
        print!("{}", s);
        if remember {
            println!("Remembering password");
        }
    }
        window.eval("window['loadNewPage']('mainpage/mainpage')").unwrap();
    }
    else{
        window.eval("window['showLoginError']()").unwrap();
    }
}

#[tauri::command]
fn did_i_logged_in(){
    unsafe{
        println!("YO I AM HERE");

        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (*my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("ls").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            print!("{}", s);   
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app.get_window("main").unwrap().set_min_size(Some(PhysicalSize::new(1280, 720))).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![log_in,did_i_logged_in])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}