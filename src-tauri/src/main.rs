#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use ssh2::{Session, DisconnectCode};
// use ssh2::{Session, Channel};
use std::{io::{Read}};
// use std::io::{Read, Write};
use tauri::{PhysicalSize, Manager};
use std::fs::File;
use std::io::{self, BufRead};
use std::path::Path;



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
    assert!(sess.authenticated());
    
    if res.is_ok(){
        unsafe{
        GLOBAL_STRUCT = Some(create_session(sess));
        let mut channel = (GLOBAL_STRUCT.as_ref().unwrap()).open_session.channel_session().unwrap();

        channel.exec("ls").unwrap();
        let mut s = String::new();
        channel.read_to_string(&mut s).unwrap();
        print!("{}", s);
        if remember {
            println!("Remembering password");
        }
    }
        window.eval("window['loadNewPage']('mainpage/mainpage')").unwrap();
        ()
    }
    else{
        window.eval("window['showLoginError']()").unwrap();
        ()
    }
}

fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where P: AsRef<Path>, {
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}


#[tauri::command]
async fn check_node(window: tauri::Window){
    unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            let mut file = File::open("cosmos.txt").unwrap();
            let mut contents = String::new();
            file.read_to_string(&mut contents).unwrap();
            let mut command = String::from("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; ");
            if let Ok(lines) = read_lines("cosmos.txt"){
                for line in lines{
                    if line.as_ref().unwrap() == "Tgrade"{
                        command= command + &String::from("which ") + &String::from(line.unwrap().to_lowercase()+"; ");    
                    }
                    else{
                        command = command + &String::from("which ") + &String::from(line.unwrap().to_lowercase() + "d; ");    
                    }
                }
                    let stringified: &str = &*command;
                    // println!("{}",stringified);
                    channel.exec(stringified).unwrap();
                    let mut s = String::new();
                    channel.read_to_string(&mut s).unwrap();
                    print!("{}", s);
        
            }
            
        }
}
}

#[tauri::command]
async fn logout(window: tauri::Window){
        unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("ls").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            print!("{}", s);
            println!("hey");
            my_boxed_session.open_session.disconnect(Some(DisconnectCode::AuthCancelledByUser), "Disconnecting from server", None).unwrap();
            window.eval("window['loadNewPage']('index.html')").unwrap();

        }
        
        }
    
}


#[tauri::command]
async fn validator_info() {
    unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("bandd status 2>&1 | jq .ValidatorInfo").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}",s);
        }
        else{
            println!("!");      
        }
        
    }
    
}

#[tauri::command]
async fn node_status() {
    unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("lavad status").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}",s);
        }
        else{
            println!("!");      
        }
        
    }
    
}


#[tauri::command]
async fn cpu_mem() -> String{
    unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("vmstat").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}",s);
            s

        }
        else{
            println!("!");
            String::from("!")         
        }
        
    }
    
}


#[tauri::command]
async fn node_info() -> String{
    unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; lavad status 2>&1").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            s

        }
        else{
            String::from("!")         
        }
        
    }
    
}


#[tauri::command]
async fn node_id() {
    unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; lavad tendermint show-node-id").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            println!("{}",s);
        }
        else{
            println!("!");      
        }
        
    }
    
}



#[tauri::command]
async fn sync_info() {
    unsafe{
        if let Some(my_boxed_session) = &GLOBAL_STRUCT{
            let mut channel = (*my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("bandd status 2>&1 | jq .SyncInfo").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            print!("{}",s);
        }
        else{
            println!("!");      
        }
        
    }
    
}




#[tauri::command]
async fn am_i_logged_out(){
    unsafe{
    if GLOBAL_STRUCT.is_none(){
        println!("I probably couldn't logged out mate.");

    }   
    else{
        println!("YAY!!! Logged the fucking out mate!");
    } 
}

}


fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app.get_window("main").unwrap().set_min_size(Some(PhysicalSize::new(1280, 720))).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![log_in,logout,am_i_logged_out,sync_info,cpu_mem,node_id,check_node])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 
