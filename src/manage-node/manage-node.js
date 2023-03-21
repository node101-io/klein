const { invoke } = window.__TAURI__.tauri;
const { writeText } = window.__TAURI__.clipboard;
const { readTextFile, writeFile } = window.__TAURI__.fs;
const { message, ask } = window.__TAURI__.dialog;

const contentOfPage = document.getElementById('content-of-page');

let ipAddresses;
let notifications;
let projectInfo;
let scrollTop;
let currentPage;

readTextFile("node-info-to-display.json").then((data) => {
  projectInfo = JSON.parse(data);
  document.querySelector(".sidebar-info-details-name").textContent = projectInfo.project;
  document.querySelector(".sidebar-info-icon").src = `../assets/projects/${projectInfo.project.toLowerCase()}.png`;
  document.querySelector(".header-node-icon").src = `../assets/projects/${projectInfo.project.toLowerCase()}.png`;
  document.querySelector(".header-menu-ip-list-button-icon").src = `../assets/projects/${projectInfo.project.toLowerCase()}.png`;
});

// Disable right click:
// document.addEventListener("contextmenu", event => event.preventDefault());

function updateCpuMem(cpu, mem) {
  charts_to_update[1].update(Math.floor(mem));
  document.querySelectorAll('.each-page-chart-percentage')[1].textContent = Math.floor(mem) + "%";

  if (cpu < 100) {
    charts_to_update[2].update(Math.floor(cpu));
    document.querySelectorAll('.each-page-chart-percentage')[2].textContent = Math.floor(cpu) + "%";
  }
}

function showCreatedWallet(mnemonic) {
  message(mnemonic, { title: "Keep your mnemonic private and secure. It's the only way to acces your wallet.", type: "info" });
  document.querySelectorAll(".each-input-field")[0].value = "";

  invoke("show_wallets");
}

function showWallets(list) {
  let walletList = document.getElementById("page-wallet-list");
  walletList.innerHTML = "";

  let adet = list.length;
  if (list.length == 0) {
    walletList.innerHTML = "No wallets found.";
  }
  while (adet > 0) {
    row = document.createElement("div");
    row.setAttribute("class", "each-row");

    if (adet == 1) {
      tekrar = 1;
    } else {
      tekrar = 2;
    }
    for (let i = 0; i < tekrar; i++) {
      halfrow = document.createElement("div");
      halfrow.setAttribute("class", "each-row-half");

      label = document.createElement("div");
      label.setAttribute("class", "each-input-label");
      label.textContent = list[adet - i - 1].name;

      outputgroup = document.createElement("div");
      outputgroup.setAttribute("class", "each-output-group");

      outputfield = document.createElement("div");
      outputfield.setAttribute("class", "each-output-field");
      outputfield.textContent = list[adet - i - 1].address.substring(0, 4) + "..." + list[adet - i - 1].address.substring(list[adet - i - 1].address.length - 4);
      outputfield.setAttribute("title", list[adet - i - 1].address);

      outputfieldiconcopy = document.createElementNS('http://www.w3.org/2000/svg', "svg");
      outputfieldiconcopy.setAttribute("class", "each-output-field-icon-copy");
      outputfieldiconcopy.setAttribute("viewBox", "0 0 17 16");
      outputfieldiconcopy.addEventListener("click", function () {
        writeText(this.previousSibling.title);
        message("Copied to clipboard.", { title: "Success", type: "success" });
      });

      path1 = document.createElementNS('http://www.w3.org/2000/svg', `path`);
      path1.setAttribute("d", "M14.0555 7.35L11.0055 4.3C10.8555 4.1 10.6055 4 10.3555 4H6.35547C5.80547 4 5.35547 4.45 5.35547 5V14C5.35547 14.55 5.80547 15 6.35547 15H13.3555C13.9055 15 14.3555 14.55 14.3555 14V8.05C14.3555 7.8 14.2555 7.55 14.0555 7.35ZM10.3555 5L13.3055 8H10.3555V5ZM6.35547 14V5H9.35547V8C9.35547 8.55 9.80547 9 10.3555 9H13.3555V14H6.35547Z M3.35547 9H2.35547V2C2.35547 1.45 2.80547 1 3.35547 1H10.3555V2H3.35547V9Z");

      outputfieldicondelete = document.createElementNS('http://www.w3.org/2000/svg', "svg");
      outputfieldicondelete.setAttribute("class", "each-output-field-icon-delete");
      outputfieldicondelete.setAttribute("viewBox", "0 0 17 16");
      outputfieldicondelete.addEventListener("click", async function () {
        if (await ask('This action cannot be reverted. Are you sure?', { title: 'Delete Wallet', type: 'warning' })) {
          showLoadingAnimation();
          invoke("delete_wallet", { walletname: this.parentNode.previousSibling.textContent }).then(() => {
            invoke("show_wallets").then(() => {
              hideLoadingAnimation();
            });
          });
        }
      });

      path2 = document.createElementNS('http://www.w3.org/2000/svg', `path`);
      path2.setAttribute("d", "M7.35547 6H6.35547V12H7.35547V6Z M10.3555 6H9.35547V12H10.3555V6Z M2.35547 3V4H3.35547V14C3.35547 14.2652 3.46083 14.5196 3.64836 14.7071C3.8359 14.8946 4.09025 15 4.35547 15H12.3555C12.6207 15 12.875 14.8946 13.0626 14.7071C13.2501 14.5196 13.3555 14.2652 13.3555 14V4H14.3555V3H2.35547ZM4.35547 14V4H12.3555V14H4.35547Z M10.3555 1H6.35547V2H10.3555V1Z");

      outputfieldiconcopy.appendChild(path1);
      outputfieldicondelete.appendChild(path2);
      outputgroup.appendChild(outputfield);
      outputgroup.appendChild(outputfieldiconcopy);
      outputgroup.appendChild(outputfieldicondelete);
      halfrow.appendChild(label);
      halfrow.appendChild(outputgroup);
      row.appendChild(halfrow);
    }
    walletList.appendChild(row);
    adet = adet - 2;
  }
  hideLoadingAnimation();
}

function showLoadingAnimation() {
  scrollTop = window.scrollY;
  document.querySelector(".all-wrapper").style.setProperty("pointer-events", "none");
  document.querySelector(".all-wrapper").style.setProperty("display", "none");
  document.querySelector(".boxes").style.setProperty("display", "unset");
}
function hideLoadingAnimation() {
  document.querySelector(".boxes").style.setProperty("display", "none");
  document.querySelector(".all-wrapper").style.removeProperty("display");
  document.querySelector(".all-wrapper").style.removeProperty("pointer-events");
  window.scrollTo(0, scrollTop);
}

window.addEventListener('DOMContentLoaded', () => {
  invoke("if_wallet_exists", { walletname: "kaka" });

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
        currentPage = page.split("/")[1].split(".")[0];
      })
      .catch(err => console.log(err));
  }

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
    message("Copied to clipboard.", { title: "Success", type: "success" });
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

  window.addEventListener("click", async (e) => {
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
      invoke("cpu_mem_stop", { a: true });
      window.location.href = "../index.html";
    }
    else {
      headerMenu.setAttribute("style", "display: none;");
      submenuIpList.setAttribute("style", "display: none;");
      scrollbarBackground.setAttribute("style", "display: none;");
      submenuNotifications.setAttribute("style", "display: none;");
    }

    submitButton = e.target.closest(".each-button");
    if (submitButton) {
      if (currentPage == "create-validator") {
        console.log("create validator")
      }
      else if (currentPage == "edit-validator") {
        console.log("edit validator")
      }
      else if (currentPage == "withdraw-rewards") {
        console.log("withdraw rewards")
      }
      else if (currentPage == "delegate-token") {
        console.log("delegate token")
      }
      else if (currentPage == "redelegate-token") {
        console.log("redelegate token")
      }
      else if (currentPage == "vote") {
        console.log("vote")
      }
      else if (currentPage == "unjail") {
        console.log("unjail")
      }
      else if (currentPage == "send-token") {
        console.log("send token")
      }
      else if (currentPage == "wallets-login") {
        showLoadingAnimation();
        invoke("update_wallet_password", { passw: document.querySelectorAll(".each-input-field")[0].value });
        changePage('page-content/wallets.html');
        invoke("show_wallets");
      }
      else if (currentPage == "wallets") {
        if (submitButton.children[0].innerText == "Create") {
          if (await invoke("if_wallet_exists", { walletname: document.querySelectorAll(".each-input-field")[0].value })) {
            if (await ask('This action will override the existing wallet. Are you sure?', { title: 'Override Wallet', type: 'warning' })) {
              showLoadingAnimation();
              invoke('delete_wallet', { walletname: document.querySelectorAll(".each-input-field")[0].value }).then(() => {
                invoke('create_wallet', { walletname: document.querySelectorAll(".each-input-field")[0].value });
              });
            }
          } else {
            showLoadingAnimation();
            invoke('create_wallet', { walletname: document.querySelectorAll(".each-input-field")[0].value });
          }
        }
        else if (submitButton.children[0].innerText == "Recover") {
          if (await invoke("if_wallet_exists", { walletname: document.querySelectorAll(".each-input-field")[1].value })) {
            if (await ask('This action will override the existing wallet. Are you sure?', { title: 'Override Wallet', type: 'warning' })) {
              showLoadingAnimation();
              invoke("delete_wallet", { walletname: document.querySelectorAll(".each-input-field")[1].value }).then(() => {
                mnemonic = "";
                document.querySelectorAll(".each-mnemonic-input-field").forEach((input) => {
                  mnemonic += input.value + " ";
                });
                mnemonic = mnemonic.slice(0, -1);
                console.log(mnemonic);
                invoke("recover_wallet", { walletname: document.querySelectorAll(".each-input-field")[1].value, mnemo: mnemonic });
              });
            }
          } else {
            // showLoadingAnimation();
            // invoke('create_wallet', { walletname: document.querySelectorAll(".each-input-field")[0].value });
            console.log("recover new wallet");
          }
        }
      }
    }

    if (document.querySelector(".page-manage-node-buttons") && document.querySelector(".page-manage-node-buttons").contains(e.target)) {
      if (document.querySelectorAll(".each-page-manage-node-button")[0].contains(e.target)) {
        // START NODE
        invoke("start_node").
          then((res) => {
            console.log(res);
          }).catch((e) => {
            console.log(e);
          });
      }
      else if (document.querySelectorAll(".each-page-manage-node-button")[1].contains(e.target)) {
        // STOP NODE
        invoke("stop_node").
          then((res) => {
            console.log(res);
          }).catch((e) => {
            console.log(e);
          });
      }
      else if (document.querySelectorAll(".each-page-manage-node-button")[2].contains(e.target)) {
        // RESTART NODE
        invoke("restart_node").
          then((res) => {
            console.log(res);
          }).catch((e) => {
            console.log(e);
          });
      }
      else if (document.querySelectorAll(".each-page-manage-node-button")[3].contains(e.target)) {
        // UPDATE NODE
        console.log("update_node function is called i guess.");
        invoke("update_node")
          .then((res) => {
            console.log(res);
          })
          .catch((e) => {
            console.log(e);
          });
      }
      else if (document.querySelector(".delete-node-button").contains(e.target)) {
        // DELETE NODE
        console.log("remove_node function is called i guess.");
        invoke("remove_node")
          .then((res) => {
            console.log(res);
          })
          .catch((e) => {
            console.log(e);
          });
      }
    }
  });
});

function loadNewPage(pagename) {
  window.location.href = pagename;
}

function current_node() {
  invoke("current_node").then((res) => {
    console.log(res);
  }).catch((e) => {
    console.log(e);
  });
}

function node_info() {
  invoke("node_info")
    .then((res) => {
      console.log(res);
    }).catch((e) => {
      console.log("oy hata.");
    });
}

function install_node() {
  invoke("install_node", { monikerName: "haciabi", nodeName: "lava" }).then((res) => {
    console.log(res);
  }).catch((e) => {
    console.log("oy hata.");
  });

}