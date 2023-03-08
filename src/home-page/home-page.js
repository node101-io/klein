const { invoke } = window.__TAURI__.tauri;
let ipAddresses;

// Disable right click:
// document.addEventListener("contextmenu", event => event.preventDefault());

window.addEventListener("DOMContentLoaded", () => {
  const testnetTabButton = document.getElementById("testnet-tab-button");
  const mainnetTabButton = document.getElementById("mainnet-tab-button");
  const testnetTabContent = document.getElementById("testnet-tab-content");
  const mainnetTabContent = document.getElementById("mainnet-tab-content");
  const nodeIcons = document.querySelector(".header-node-icons");
  const headerMenu = document.querySelector(".header-menu");
  const headerMenuIpButton = document.querySelector(".header-menu-ip-list-button");
  const notificationsButton = document.getElementById("notifications-button");
  const logoutButton = document.getElementById("logout-button");
  const submenuIpList = document.querySelector(".header-submenu-ip-list");
  const scrollbarBackground = document.querySelector(".header-menu-scroll-background");
  const submenuNotifications = document.querySelector(".header-submenu-notifications");

  testnetTabButton.addEventListener("click", () => {
    testnetTabButton.setAttribute("class", "each-nodes-page-tab active-tab");
    mainnetTabButton.setAttribute("class", "each-nodes-page-tab");
    mainnetTabContent.setAttribute("style", "display: none;");
    testnetTabContent.setAttribute("style", "display: flex;");
  });

  mainnetTabButton.addEventListener("click", () => {
    testnetTabButton.setAttribute("class", "each-nodes-page-tab");
    mainnetTabButton.setAttribute("class", "each-nodes-page-tab active-tab");
    testnetTabContent.setAttribute("style", "display: none;");
    mainnetTabContent.setAttribute("style", "display: flex;");
  });

  window.addEventListener("click", (e) => {
    console.log(e.target.parentNode);
    if (nodeIcons.contains(e.target)) {
      if (headerMenu.style.display == "block") {
        headerMenu.setAttribute("style", "display: none;");
        submenuIpList.setAttribute("style", "display: none;");
        submenuNotifications.setAttribute("style", "display: none;");
        scrollbarBackground.setAttribute("style", "display: none;");
      }
      else {
        headerMenu.setAttribute("style", "display: block;");
      }
    }
    else if (headerMenuIpButton.contains(e.target)) {
      submenuNotifications.setAttribute("style", "display: none;");
      if (submenuIpList.style.display == "block") {
        submenuIpList.setAttribute("style", "display: none;");
        scrollbarBackground.setAttribute("style", "display: none;");
      }
      else {
        submenuIpList.setAttribute("style", "display: block;");
        scrollbarBackground.setAttribute("style", "display: block;");
      }
    }
    else if (notificationsButton.contains(e.target)) {
      submenuIpList.setAttribute("style", "display: none;");
      if (submenuNotifications.style.display == "block") {
        submenuNotifications.setAttribute("style", "display: none;");
        scrollbarBackground.setAttribute("style", "display: none;");
      }
      else {
        submenuNotifications.setAttribute("style", "display: block;");
        scrollbarBackground.setAttribute("style", "display: block;");
      }
    }
    else if (logoutButton.contains(e.target)) {
      window.location.href = "../index.html";
    }
    else {
      headerMenu.setAttribute("style", "display: none;");
      submenuIpList.setAttribute("style", "display: none;");
      scrollbarBackground.setAttribute("style", "display: none;");
      submenuNotifications.setAttribute("style", "display: none;");
    }
  });
});

function loadNewPage(pagename) {
  window.location.href = pagename;
}

function logout(){
  invoke("log_out");
}

function cpu_mem(){
  invoke("cpu_mem");
}

function current_node(){
  invoke("current_node").then((res)=>{
    console.log(res);
  }).catch((e)=>{
    console.log(e);
  });
}

function logged_out(){
  invoke("am_i_logged_out");
}

function node_info(){
  invoke("node_info")
  .then((res) => {
    console.log(res);
  }).catch((e)=>{
    console.log("oy hata.");
  }); 
}

function install_node(){
  invoke("install_node",{monikerName:"haciabi",nodeName:"lava"}).then((res) => {
    console.log(res);
  }).catch((e)=>{
    console.log("oy hata.");
  });

}

function show_wallets(){
  invoke("show_wallets")
  .then((res) => {
    console.log(res);
  }).catch((e)=>{
    console.log("oy hata.");
  }); 
}

function create_wallet(){
  invoke("create_wallet",{walletName:"modapalas"})
  .then((res) => {
    console.log(res);
  }).catch((e)=>{
    console.log("oy hata.");
  }); 
}

function delete_wallet(){
  invoke("delete_wallet",{walletName:"modapalas"})
  .then((res) => {
    console.log(res);
  }).catch((e)=>{
    console.log("oy hata.");
  }); 
}

