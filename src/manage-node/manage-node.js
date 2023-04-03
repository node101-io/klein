const { invoke } = window.__TAURI__.tauri;
const { message, ask } = window.__TAURI__.dialog;
const { writeText } = window.__TAURI__.clipboard;

const ipAddresses = localStorage.getItem("ipaddresses") ? JSON.parse(localStorage.getItem("ipaddresses")) : [];
const notifications = localStorage.getItem("notifications") ? JSON.parse(localStorage.getItem("notifications")) : [];
const project = localStorage.getItem("project");
const imgSrc = project ? `../assets/projects/${project.toLowerCase().replace(" ", "-")}.png` : "../assets/projects/default.png";

async function changePage(page, callback) {
  document.getElementById("content-of-page").innerHTML = await (await fetch(page)).text();
  if (callback) {
    callback();
  }
}

// TO BE CALLED FROM RUST
async function updateNodeInfo(obj) {
  if (obj == null) {
    message("Node is not running.", { title: "Error", type: "error" });
    hideLoadingAnimation();
    return;
  }
  await changePage("page-content/node-information.html");
  let fields = document.querySelectorAll(".each-output-field");
  fields[0].textContent = obj.NodeInfo.protocol_version.p2p;
  fields[1].textContent = obj.NodeInfo.protocol_version.block;
  fields[2].textContent = obj.NodeInfo.protocol_version.app;
  fields[3].textContent = obj.NodeInfo.id;
  fields[4].textContent = obj.NodeInfo.listen_addr;
  fields[5].textContent = obj.NodeInfo.network;
  fields[6].textContent = obj.NodeInfo.version;
  fields[7].textContent = obj.NodeInfo.channels;
  fields[8].textContent = obj.NodeInfo.moniker;
  fields[9].textContent = obj.NodeInfo.other.tx_index;
  fields[10].textContent = obj.NodeInfo.other.rpc_address;
  fields[11].textContent = obj.SyncInfo.latest_block_hash;
  fields[12].textContent = obj.SyncInfo.latest_app_hash;
  fields[13].textContent = obj.SyncInfo.latest_block_height;
  fields[14].textContent = obj.SyncInfo.latest_block_time;
  fields[15].textContent = obj.SyncInfo.earliest_block_hash;
  fields[16].textContent = obj.SyncInfo.earliest_app_hash;
  fields[17].textContent = obj.SyncInfo.earliest_block_height;
  fields[18].textContent = obj.SyncInfo.earliest_block_time;
  fields[19].textContent = obj.SyncInfo.catching_up;
  // fields[20].textContent = obj.ValidatorInfo.Address;
  // fields[21].textContent = obj.ValidatorInfo.PubKey.type;
  // fields[22].textContent = obj.ValidatorInfo.PubKey.value;
  // fields[23].textContent = obj.ValidatorInfo.VotingPower;
  hideLoadingAnimation();
}
function showCreatedWallet(mnemonic) {
  message(mnemonic.slice(1, -1), { title: "Keep your mnemonic private and secure. It's the only way to acces your wallet.", type: "info" });
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

      outputfieldiconcopy = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      outputfieldiconcopy.setAttribute("class", "each-output-field-icon-copy");
      outputfieldiconcopy.setAttribute("viewBox", "0 0 17 16");
      outputfieldiconcopy.addEventListener("click", function () {
        writeText(this.previousSibling.title);
        message("Copied to clipboard.", { title: "Success", type: "success" });
      });

      path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path1.setAttribute("d", "M14.0555 7.35L11.0055 4.3C10.8555 4.1 10.6055 4 10.3555 4H6.35547C5.80547 4 5.35547 4.45 5.35547 5V14C5.35547 14.55 5.80547 15 6.35547 15H13.3555C13.9055 15 14.3555 14.55 14.3555 14V8.05C14.3555 7.8 14.2555 7.55 14.0555 7.35ZM10.3555 5L13.3055 8H10.3555V5ZM6.35547 14V5H9.35547V8C9.35547 8.55 9.80547 9 10.3555 9H13.3555V14H6.35547Z M3.35547 9H2.35547V2C2.35547 1.45 2.80547 1 3.35547 1H10.3555V2H3.35547V9Z");

      outputfieldicondelete = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      outputfieldicondelete.setAttribute("class", "each-output-field-icon-delete");
      outputfieldicondelete.setAttribute("viewBox", "0 0 17 16");
      outputfieldicondelete.addEventListener("click", async function () {
        if (await ask("This action cannot be reverted. Are you sure?", { title: "Delete Wallet", type: "warning" })) {
          showLoadingAnimation();
          invoke("delete_wallet", { walletname: this.parentNode.previousSibling.textContent }).then(() => {
            invoke("show_wallets").then(() => {
              hideLoadingAnimation();
            });
          });
        }
      });

      path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
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
function updateSync(height, catchup) {
  if (typeof catchup == "undefined") {
    syncStatusChart.options.barColor = "#FF2632";
    syncStatusChart.update(100);
    document.querySelectorAll(".each-page-chart-percentage")[0].textContent = "!";
    document.querySelector(".each-page-chart-text-pop-up").innerText = "Node has stopped!";
  } else if (!catchup) {
    syncStatusChart.options.barColor = "#43BE66";
    syncStatusChart.update(100);
    document.querySelectorAll(".each-page-chart-percentage")[0].textContent = (height);
    document.querySelector(".each-page-chart-text-pop-up").innerText = "Synced!\n\nCurrent Block:\n" + height;
  } else {
    syncStatusChart.options.barColor = "#0F62FE";
    (async () => {
      await new Promise(resolve => setTimeout(resolve, 2300));
      syncStatusChart.update(100);
      await new Promise(resolve => setTimeout(resolve, 2300));
      syncStatusChart.update(0);
    })();
    document.querySelectorAll(".each-page-chart-percentage")[0].textContent = height;
    document.querySelector(".each-page-chart-text-pop-up").innerText = `Syncing...\n\nCurrent Block:\n${height}`;
  }
}
function updateCpuMem(cpu, mem) {
  if (cpu < 100) {
    cpuStatusChart.update(Math.floor(cpu));
    document.querySelectorAll(".each-page-chart-percentage")[2].textContent = Math.floor(cpu) + "%";
  }
  memStatusChart.update(Math.floor(mem));
  document.querySelectorAll(".each-page-chart-percentage")[1].textContent = Math.floor(mem) + "%";
}
function updateStatus(status) {
  if (status == "active") {
    document.querySelectorAll(".each-sidebar-tag")[0].classList.remove("inactive-tag");
    document.querySelectorAll(".each-sidebar-tag")[0].classList.add("active-tag");
    document.querySelectorAll(".each-sidebar-tag")[0].textContent = "Active";
  } else {
    document.querySelectorAll(".each-sidebar-tag")[0].classList.add("inactive-tag");
    document.querySelectorAll(".each-sidebar-tag")[0].classList.remove("active-tag");
    document.querySelectorAll(".each-sidebar-tag")[0].textContent = status.charAt(0).toUpperCase() + status.slice(1);
  }
}
function updateVersion(version) {
  if (typeof version !== "undefined") {
    document.querySelectorAll(".each-sidebar-tag")[1].textContent = "Version " + version;
    document.querySelectorAll(".each-sidebar-tag")[1].classList.add("version-tag");
  }
}
function endInstallation() {
  document.querySelectorAll(".each-progress-bar-status-icon")[0].setAttribute("style", "display: unset;")
  document.querySelector(".progress-bar").setAttribute("value", "100");
  document.querySelector(".progress-bar-text-right").textContent = "100%";
  invoke("check_if_password_needed").then(() => {
    invoke("cpu_mem_sync");
  });
}

// Page Setups
function walletsSetup() {
  document.querySelector(".each-mnemonic-input-field").addEventListener("paste", function () {
    setTimeout(() => {
      if (this.value.split(" ").length == 24) {
        mnemo = this.value.split(" ");
        document.querySelectorAll(".each-mnemonic-input-field").forEach((element, index) => {
          element.value = mnemo[index];
        });
      }
    }, 100);
  });
  document.querySelectorAll(".each-button")[0].addEventListener("click", async function (e) {
    if (await invoke("if_wallet_exists", { walletname: document.querySelectorAll(".each-input-field")[0].value })) {
      if (await ask("This action will override the existing wallet. Are you sure?", { title: "Override Wallet", type: "warning" })) {
        showLoadingAnimation();
        invoke("delete_wallet", { walletname: document.querySelectorAll(".each-input-field")[0].value }).then(() => {
          invoke("create_wallet", { walletname: document.querySelectorAll(".each-input-field")[0].value });
        });
      }
    } else {
      showLoadingAnimation();
      invoke("create_wallet", { walletname: document.querySelectorAll(".each-input-field")[0].value });
    }
  });
  document.querySelectorAll(".each-button")[1].addEventListener("click", async function (e) {
    if (await invoke("if_wallet_exists", { walletname: document.querySelectorAll(".each-input-field")[1].value })) {
      if (await ask("This action will override the existing wallet. Are you sure?", { title: "Override Wallet", type: "warning" })) {
        showLoadingAnimation();
        invoke("delete_wallet", { walletname: document.querySelectorAll(".each-input-field")[1].value }).then(() => {
          mnemonic = "";
          document.querySelectorAll(".each-mnemonic-input-field").forEach((input) => {
            mnemonic += input.value + " ";
          });
          mnemonic = mnemonic.slice(0, -1);
          invoke("recover_wallet", { walletname: document.querySelectorAll(".each-input-field")[1].value, mnemo: mnemonic });
        });
      }
    } else {
      showLoadingAnimation();
      mnemonic = "";
      document.querySelectorAll(".each-mnemonic-input-field").forEach((input) => {
        mnemonic += input.value + " ";
      });
      mnemonic = mnemonic.slice(0, -1);
      invoke("recover_wallet", { walletname: document.querySelectorAll(".each-input-field")[1].value, mnemo: mnemonic });
    }
  });
}
function walletsLoginSetup() {
  document.querySelector(".each-input-helper-text").addEventListener("click", async () => {
    if (await ask("This action will delete all the wallets. Are you sure you want to continue?", { title: "Reset Keyring", type: "warning" })) {
      invoke("delete_keyring");
      localStorage.setItem("keyring", '{"required": true, "exists": false}');
      await changePage("page-content/wallets-create-keyring.html", createKeyringSetup);
    }
  });
  document.querySelector(".each-button").addEventListener("click", () => {
    showLoadingAnimation();
    invoke("check_wallet_password", { passw: document.querySelectorAll(".each-input-field")[0].value }).then(async (result) => {
      if (result) {
        await changePage("page-content/wallets.html", walletsSetup);
        invoke("show_wallets");
      } else {
        message("", { title: "Wrong password.", type: "error" });
        hideLoadingAnimation();
      }
    });
  });
}
function createKeyringSetup() {
  document.querySelector(".each-button").addEventListener("click", async () => {
    if (document.querySelectorAll(".each-input-field")[0].value !== document.querySelectorAll(".each-input-field")[1].value) {
      message("Passphrases do not match.", { type: "error" });
    }
    else if (document.querySelectorAll(".each-input-field")[0].value.length < 8) {
      message("Passphrase must be at least 8 characters.", { type: "error" });
    }
    else {
      showLoadingAnimation();
      invoke("create_keyring", { passphrase: document.querySelector(".each-input-field").value });
      localStorage.setItem("keyring", '{"required": true, "exists": true}');
      await changePage("page-content/wallets-login.html", walletsLoginSetup);
      hideLoadingAnimation();
    }
  });
}
function nodeOperationSetup() {
  document.querySelectorAll(".each-page-manage-node-button")[0].addEventListener("click", async () => {
    invoke("start_stop_restart_node", { action: "start" });
  });
  document.querySelectorAll(".each-page-manage-node-button")[1].addEventListener("click", async () => {
    invoke("start_stop_restart_node", { action: "stop" });
  });
  document.querySelectorAll(".each-page-manage-node-button")[2].addEventListener("click", async () => {
    invoke("start_stop_restart_node", { action: "restart" });
  });
  document.querySelectorAll(".each-page-manage-node-button")[3].addEventListener("click", async () => {
    invoke("update_node");
  });
  document.querySelector(".delete-node-button").addEventListener("click", async () => {
    if (await ask("This action cannot be reverted. Are you sure?", { title: "Delete Node", type: "warning" })) {
      showLoadingAnimation();
      invoke("delete_node").then(() => {
        invoke("cpu_mem_sync_stop");
        localStorage.setItem("project", "");
        localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses.map((ip) => {
          return ip.ip === localStorage.getItem("ip") ? { ...ip, icon: "" } : ip;
        })));
        setTimeout(() => {
          message("Node deleted successfully.", { title: "Success", type: "success" });
          window.location.href = "../home-page/home-page.html";
        }, 1000);
      });
    }
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  syncStatusChart = new EasyPieChart(document.querySelectorAll(".each-page-chart")[0], {
    size: 160,
    barColor: "rgba(15, 98, 254, 1)",
    scaleLength: 0,
    lineWidth: 6,
    trackColor: "#373737",
    lineCap: "circle",
    animate: 2000,
  });
  cpuStatusChart = new EasyPieChart(document.querySelectorAll(".each-page-chart")[1], {
    size: 160,
    barColor: "rgba(15, 98, 254, 1)",
    scaleLength: 0,
    lineWidth: 6,
    trackColor: "#373737",
    lineCap: "circle",
    animate: 2000,
  });
  memStatusChart = new EasyPieChart(document.querySelectorAll(".each-page-chart")[2], {
    size: 160,
    barColor: "rgba(15, 98, 254, 1)",
    scaleLength: 0,
    lineWidth: 6,
    trackColor: "#373737",
    lineCap: "circle",
    animate: 2000,
  });

  if (localStorage.getItem("installation") == "true") {
    localStorage.setItem("installation", "false");
    localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses.map((ip) => {
      return ip.ip === localStorage.getItem("ip") ? { ...ip, icon: project } : ip;
    })));
    invoke("install_node");
    await changePage("page-content/installation.html");
    for (let i = 0; i < 100; i++) {
      console.log(document.querySelectorAll(".each-progress-bar-status-icon")[0].getAttribute("style"));
      if (document.querySelectorAll(".each-progress-bar-status-icon")[0].getAttribute("style") == "display: unset;") {
        break;
      }
      document.querySelector(".progress-bar").setAttribute("value", i);
      document.querySelector(".progress-bar-text-right").textContent = `${i}%`;
      await new Promise(r => setTimeout(r, i * i / 0.015));
    }
  }
  else {
    await changePage("page-content/node-operations.html", nodeOperationSetup);
    invoke("check_if_password_needed").then(() => {
      invoke("cpu_mem_sync");
    });
  }

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
  const delegateTokenButton = document.getElementById("delegate-token-button");
  const sendTokenButton = document.getElementById("send-token-button");
  const redelegateTokenButton = document.getElementById("redelegate-token-button");
  const voteButton = document.getElementById("vote-button");
  const walletsButton = document.getElementById("wallets-button");

  document.querySelector(".sidebar-info-details-name").textContent = project;
  document.querySelector(".sidebar-info-icon").setAttribute("src", imgSrc);

  createHeaderMenu();

  validatorAddress.addEventListener("click", function () {
    writeText(validatorAddressText.innerText);
    message("Copied to clipboard.", { title: "Success", type: "success" });
  })
  homePageButton.addEventListener("click", function () {
    showLoadingAnimation();
    invoke("cpu_mem_sync_stop");
    setTimeout(() => {
      window.location.href = "../home-page/home-page.html";
    }, 1000);
  });
  nodeOperationsButton.addEventListener("click", async function () {
    await changePage("page-content/node-operations.html", nodeOperationSetup);
  });
  createValidatorButton.addEventListener("click", async function () {
    await changePage("page-content/create-validator.html");
  });
  editValidatorButton.addEventListener("click", async function () {
    await changePage("page-content/edit-validator.html");
  });
  withdrawRewardsButton.addEventListener("click", async function () {
    await changePage("page-content/withdraw-rewards.html");
  });
  unjailButton.addEventListener("click", async function () {
    await changePage("page-content/unjail.html");
  });
  delegateTokenButton.addEventListener("click", async function () {
    await changePage("page-content/delegate-token.html");
  });
  sendTokenButton.addEventListener("click", async function () {
    await changePage("page-content/send-token.html");
  });
  redelegateTokenButton.addEventListener("click", async function () {
    await changePage("page-content/redelegate-token.html");
  });
  voteButton.addEventListener("click", async function () {
    await changePage("page-content/vote.html");
  });
  walletsButton.addEventListener("click", async function () {
    if (JSON.parse(localStorage.getItem("keyring")).required) {
      if (JSON.parse(localStorage.getItem("keyring")).exists) {
        await changePage("page-content/wallets-login.html", walletsLoginSetup);
      } else {
        await changePage("page-content/wallets-create-keyring.html", createKeyringSetup);
      }
    } else {
      await changePage("page-content/wallets.html", walletsSetup);
    }
  });
  validatorOperationsButton.addEventListener("click", function () {
    if (window.getComputedStyle(subButtonsDiv).getPropertyValue("display") == "none") {
      subButtonsDiv.setAttribute("style", "display: block");
      validatorOperationsArrow.setAttribute("style", "transform: rotate(-180deg); transition: 0.5s;");
    }
    else {
      validatorOperationsArrow.setAttribute("style", "transform: rotate(0); transition: 0.5s;");
      subButtonsDiv.setAttribute("style", "display: none");
    }
  })
  nodeInformationButton.addEventListener("click", function () {
    showLoadingAnimation();
    invoke("node_info");
  });

  window.addEventListener("click", async (e) => {
    hideMenuWhenClickedOutside(e);
  });
});