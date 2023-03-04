const { invoke } = window.__TAURI__.tauri;
let ipAddresses;

// Disable right click:
// document.addEventListener("contextmenu", event => event.preventDefault());

window.addEventListener("DOMContentLoaded", () => {
  let testnetTabButton = document.getElementById("testnet-tab-button");
  let mainnetTabButton = document.getElementById("mainnet-tab-button");
  let testnetTabContent = document.getElementById("testnet-tab-content");
  let mainnetTabContent = document.getElementById("mainnet-tab-content");
  let nodeIcons = document.querySelector(".header-node-icons");
  let headerMenu = document.querySelector(".header-menu");
  let headerMenuIpButton = document.querySelector(".header-menu-ip-list-button");
  let notificationsButton = document.getElementById("notifications-button");
  let logoutButton = document.getElementById("logout-button");
  let submenuIpList = document.querySelector(".header-submenu-ip-list");
  let scrollbarBackground = document.querySelector(".header-menu-scroll-background");
  let submenuNotifications = document.querySelector(".header-submenu-notifications");

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