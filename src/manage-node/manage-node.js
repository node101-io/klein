const { invoke } = window.__TAURI__.tauri;
const { writeText } = window.__TAURI__.clipboard;
const { readTextFile, writeFile } = window.__TAURI__.fs;
const contentOfPage = document.getElementById('content-of-page');
let ipAddresses;
let notifications;

// invoke('create_wallet', { walletname: 'test', password: 'test' });

function updateCpuMem(cpu, mem) {
  charts_to_update[1].update(Math.floor(mem));
  charts_to_update[2].update(Math.floor(cpu));
  document.querySelectorAll('.each-page-chart-percentage')[1].textContent = Math.floor(mem) + "%";
  document.querySelectorAll('.each-page-chart-percentage')[2].textContent = Math.floor(cpu) + "%";
}

window.addEventListener('DOMContentLoaded', () => {
  charts_to_update = [];
  document.querySelectorAll('.each-page-chart').forEach((element) => {
    charts_to_update.push(new EasyPieChart(element, {
      size: 160,
      barColor: "rgba(15, 98, 254, 1)",
      scaleLength: 0,
      lineWidth: 6,
      trackColor: "#373737",
      lineCap: "circle",
      animate: 1000,
    }))
  });

  function changePage(page) {
    fetch(page)
      .then(response => response.text())
      .then(html => {
        contentOfPage.innerHTML = html;
        submitButton = document.getElementById('submit-button');
      })
      .catch(err => console.log(err));
  }

  invoke("cpu_mem_start_stop", { a: true });
  changePage('page-content/node-operations.html')

  const validatorAddress = document.querySelector(".sidebar-info-details-copy");
  const validatorAddressText = document.querySelector(".sidebar-info-details-copy-address");
  const validatorOperationsButton = document.getElementById("validator-operations-button");
  const validatorOperationsArrow = document.querySelector(".each-dropdown-button-arrow");
  const nodeInformationButton = document.getElementById("node-information-button");
  const subButtonsDiv = document.querySelector(".sidebar-dropdown-subbuttons");
  const homePageButton = document.getElementById("home-page-button");
  const nodeOperationsButton = document.getElementById("node-operations-button");
  const createValidatorButton = document.getElementById("create-validator-button");
  const editValidatorButton = document.getElementById("edit-validator-button");
  const withdrawRewardsButton = document.getElementById("withdraw-rewards-button");
  const unjailButton = document.getElementById("unjail-button");
  const recoverWalletButton = document.getElementById("recover-wallet-button");
  const delegateTokenButton = document.getElementById("delegate-token-button");
  const sendTokenButton = document.getElementById("send-token-button");
  const redelegateTokenButton = document.getElementById("redelegate-token-button");
  const voteButton = document.getElementById("vote-button");
  const walletsButton = document.getElementById("wallets-button");
  const nodeIcons = document.querySelector(".header-node-icons");
  const headerMenu = document.querySelector(".header-menu");
  const headerMenuIpButton = document.querySelector(".header-menu-ip-list-button");
  const notificationsButton = document.getElementById("notifications-button");
  const logoutButton = document.getElementById("logout-button");
  const submenuIpList = document.querySelector(".header-submenu-ip-list");
  const scrollbarBackground = document.querySelector(".header-menu-scroll-background");
  const submenuNotifications = document.querySelector(".header-submenu-notifications");

  readTextFile("ipaddresses.json").then((data) => {
    ipAddresses = JSON.parse(data);
    for (let i = 0; i < ipAddresses.length; i++) {
      ipListItem = document.createElement("div");
      ipListItem.setAttribute("class", "each-header-submenu-ip-list-item");
      ipListItemIcon = document.createElement("img");
      ipListItemIcon.setAttribute("src", `../assets/projects/${ipAddresses[i].icon.toLowerCase()}.png`);
      ipListItemIcon.setAttribute("class", "each-header-submenu-ip-list-item-icon");
      ipListItemName = document.createElement("div");
      ipListItemName.setAttribute("class", "each-header-submenu-ip-list-item-name");
      ipListItemName.innerText = ipAddresses[i].icon;
      ipListItemIp = document.createElement("div");
      ipListItemIp.setAttribute("class", "each-header-submenu-ip-list-item-ip");
      ipListItemIp.innerText = ipAddresses[i].ip;
      ipListItem.appendChild(ipListItemIcon);
      ipListItem.appendChild(ipListItemName);
      ipListItem.appendChild(ipListItemIp);
      submenuIpList.appendChild(ipListItem);
    }
  });

  readTextFile("notifications.json").then((data) => {
    notifications = JSON.parse(data);
  });

  validatorAddress.addEventListener('click', function () {
    writeText(validatorAddressText.innerText);
  })
  homePageButton.addEventListener('click', function () {
    window.location.href = '../home-page/home-page.html';
  });
  nodeOperationsButton.addEventListener('click', function () {
    changePage('page-content/node-operations.html');
  });
  createValidatorButton.addEventListener('click', function () {
    changePage('page-content/create-validator.html');
  });
  editValidatorButton.addEventListener('click', function () {
    changePage('page-content/edit-validator.html');
  });
  withdrawRewardsButton.addEventListener('click', function () {
    changePage('page-content/withdraw-rewards.html');
  });
  unjailButton.addEventListener('click', function () {
    changePage('page-content/unjail.html');
  });
  recoverWalletButton.addEventListener('click', function () {
    changePage('page-content/recover-wallet.html');
  });
  delegateTokenButton.addEventListener('click', function () {
    changePage('page-content/delegate-token.html');
  });
  sendTokenButton.addEventListener('click', function () {
    changePage('page-content/send-token.html');
  });
  redelegateTokenButton.addEventListener('click', function () {
    changePage('page-content/redelegate-token.html');
  });
  voteButton.addEventListener('click', function () {
    changePage('page-content/vote.html');
  });
  walletsButton.addEventListener('click', function () {
    changePage('page-content/wallets-login.html')
  });
  validatorOperationsButton.addEventListener('click', function () {
    if (window.getComputedStyle(subButtonsDiv).getPropertyValue("display") == "none") {
      subButtonsDiv.setAttribute("style", "display: block");
      validatorOperationsArrow.setAttribute("style", "transform: rotate(-180deg); transition: 0.5s;");
    }
    else {
      validatorOperationsArrow.setAttribute("style", "transform: rotate(0); transition: 0.5s;");
      subButtonsDiv.setAttribute("style", "display: none");
    }
  })
  nodeInformationButton.addEventListener('click', function () {
    changePage('page-content/node-information.html');
  });

  window.addEventListener("click", (e) => {
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
        scrollbarBackground.setAttribute("style", `display: block; height: ${Math.min(ipAddresses.length, 3) * 60}px;`);
      }
    }
    else if (notificationsButton.contains(e.target)) {
      submenuIpList.setAttribute("style", "display: none;");

      readTextFile("notifications.json").then((data) => {
        notifications = JSON.parse(data);
    
        // <div class="each-header-submenu-notifications-item">
        //   <span class="each-notification-icon"></span>
        //   <div class="each-notification-content">Example notification</div>
        // </div>

        submenuNotifications.innerHTML = "";
    
        for (let i = notifications.length - 1; 0 < i; i--) {
          notificationItem = document.createElement("div");
          notificationItem.setAttribute("class", "each-header-submenu-notifications-item");
          notificationIcon = document.createElement("span");
          notificationIcon.setAttribute("class", `each-notification-icon${notifications[i].unread ? '' : '-seen'}`);
          notificationContent = document.createElement("div");
          notificationContent.setAttribute("class", "each-notification-content");
          notificationContent.innerText = notifications[i].text;
          notificationItem.appendChild(notificationIcon);
          notificationItem.appendChild(notificationContent);
          submenuNotifications.appendChild(notificationItem);
        }
        document.querySelector(".header-node-icon-notification").setAttribute("style", "display: none;");
        document.querySelector(".each-header-menu-item-notification").setAttribute("style", "display: none;");
      });

      writeFile("notifications.json", JSON.stringify(notifications.map((notification) => {
        notification.unread = false;
        return notification;
      })));

      if (submenuNotifications.style.display == "block") {
        submenuNotifications.setAttribute("style", "display: none;");
        scrollbarBackground.setAttribute("style", "display: none;");
      }
      else {
        submenuNotifications.setAttribute("style", "display: block;");
        scrollbarBackground.setAttribute("style", `display: block; height: ${Math.min(notifications.length, 6) * 36}px;`);
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

    if (submitButton && submitButton.contains(e.target)) {
      let page = document.querySelector(".page-heading").innerText;
      if (page == "Create Validator") {
        console.log("create validator")
      }
      else if (page == "Edit Validator") {
        console.log("edit validator")
      }
      else if (page == "Withdraw Rewards") {
        console.log("withdraw rewards")
      }
      else if (page == "Delegate Token") {
        console.log("delegate token")
      }
      else if (page == "Redelegate Token") {
        console.log("redelegate token")
      }
      else if (page == "Voting") {
        console.log("voting")
      }
      else if (page == "Unjail") {
        console.log("unjail")
      }
      else if (page == "Send Token") {
        console.log("send token")
      }
      else if (page == "Recover Wallet") {
        console.log("recover wallet")
      }
      else if (page == "See Wallets") {
        changePage('page-content/wallets.html');
      }
      else if (page == "Create Wallet") {
        console.log("wallets")
      }
    }
  });
});