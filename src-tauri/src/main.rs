#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use ssh2::{Session, Channel, DisconnectCode};
use std::io::{Read, Write};
use tauri::{Manager, LogicalSize, Position};
use std::fs::File;
use std::io::{self, BufRead};
use std::path::Path;


//SESSION OPERATIONS
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

// DON'T KNOW IF THAT WILL BE NECESSARY.
// fn modify_session(session:Session,manager: &mut SessionManager) {
//     manager.open_session = session;
// }





// LOGIN --- LOGOUT FUNCTUONS
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
      let mut channel = (GLOBAL_STRUCT.as_ref().unwrap()).open_session.channel_session().unwrap();

      channel.exec("ls").unwrap();
      let mut s = String::new();
      channel.read_to_string(&mut s).unwrap();
      print!("{}", s);
      if remember {
          println!("Remembering password");
      }   
  }
      window.eval("window['loadNewPage']('mainpage/mainpage.html')").unwrap();
      ()
  }
  else{
      window.eval("window['showLoginError']()").unwrap();
      ()
  }
}

#[tauri::command]
async fn logout(window: tauri::Window){
        unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("echo ").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            print!("{}", s);
            println!("hey");
            my_boxed_session.open_session.disconnect(Some(DisconnectCode::AuthCancelledByUser), "Disconnecting from server", None).unwrap();
            window.eval("window['loadNewPage']('../index.html')").unwrap();

        }
        
        }
    
}




// INFORMATIN ABOUT SERVER & NODE.
fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where P: AsRef<Path>, {
  let file = File::open(filename)?;
  Ok(io::BufReader::new(file).lines())
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
async fn validator_info() {
    unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; lavad status 2>&1 | jq .ValidatorInfo").unwrap();
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
            channel.exec("export PATH=$PATH:/usr/local/go/bin:/root/go/bin; lavad status").unwrap();
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
async fn am_i_logged_out(){
  unsafe{
  if GLOBAL_STRUCT.is_none(){
      println!("Logged out successfully.");

  }   
  else{
      println!("You're still logged in.");
  } 
}
}

#[tauri::command]

async fn remove_node(node_name: String,window: tauri::Window) -> Result<String,String> {
  println!("removing.");
  Ok("True.".into())
}

#[tauri::command]
async fn create_validator(amount: String,wallet_name: String,moniker_name: String, website:String,password:String,contact:String,keybase_id:String,com_rate:String,fees:String,details:String) -> Result<String,String>{
  Ok("Will create a validator".into())

}

#[tauri::command]
async fn edit_validator(wallet_name: String,new_moniker_name: String, website:String,password:String,contact:String,keybase_id:String,com_rate:String,details:String) -> Result<String,String>{
  Ok("Will edit a validator".into())

}

#[tauri::command]
async fn withdraw_reward(wallet_name:String,fees:String,password:String)-> Result<String,String>{
  Ok("Will withdraw stuff.".into())
}

#[tauri::command]
async fn delegate_token(wallet_name:String,valoper:String,password:String,fees:String)->Result<String,String>{
  Ok("Will delegate stuff.".into())

}

#[tauri::command]
async fn redelegate_token(wallet_name:String,destination_address:String,password:String,fees:String,first_validator:String)->Result<String,String>{
  Ok("Will redelegate stuff.".into())

}

#[tauri::command]
async fn install_node(moniker_name: String, node_name: String, window: tauri::Window) -> Result<String,String>{
    unsafe{
        if let Some(my_boxed_session) = GLOBAL_STRUCT.as_ref(){
            let mut channel = (my_boxed_session).open_session.channel_session().unwrap();
            channel.exec("echo 'export MONIKER=' {moniker_name} >> $HOME/.bash_profile; wget -O {node_name}.sh https://node101.io/mainnet/{node_name}.sh && chmod +x {node_name}.sh && ./{node_name}.sh").unwrap();
            channel.exec("which {node_name}").unwrap();
            let mut s = String::new();
            channel.read_to_string(&mut s).unwrap();
            print!("{}", s);

            Ok("Yay.".into())

        }
        else{
            Err("Ops.".into())   
        }    
       
}
}

//Should give first wallet's password if created before.
#[tauri::command]
async fn create_wallet(wallet_name:String,password:String) -> Result<String,String> {
  Ok("Will return mnemonics if created first, if not then will return a success or anything.".into())
}

#[tauri::command]
async fn recover_wallet(wallet_name:String,password:String) -> Result<String,String> {
  Ok("Will return mnemonics if created first, if not then will return a success or anything.".into())
}

#[tauri::command]
async fn add_wallet(wallet_name: String,password: String) -> Result<String,String>{
  Ok("Will add new wallet, return name or stuff.".into())

}

#[tauri::command]
async fn vote(wallet_name:String,proposoal_num:String,mnemonic:String,option:String) -> Result<String,String> {
  Ok("Should print result, in a json if possible.".into())
}

#[tauri::command]
async fn unjail(wallet_name:String,password:String,fees:String) -> Result<String,String> {
    Ok("Will return mnemonics if created first, if not then will return a success or anything.".into())
}

#[tauri::command]
async fn send_token(wallet_name: String, receiver_address: String, amount: String, password: String) ->Result<String,String>{

  Ok("Will send token".into())
}



fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app.get_window("main").unwrap().set_min_size(Some(LogicalSize::new(1280, 720))).unwrap();
            app.get_window("main").unwrap().center().unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![log_in,logout,cpu_mem,node_info,am_i_logged_out])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 