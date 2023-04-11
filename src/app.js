const { tauri, dialog, clipboard, http, event: tevent } = window.__TAURI__;

localStorage.setItem("ipaddresses", '[{"ip":"144.91.93.154","icon":"Babylon"},{"ip":"213.136.73.17","icon":"Lava Network"}]');
localStorage.setItem("notifications", '[{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":true,"text":"Example notif!"},{"unread":true,"text":"Example notif!"}]');

const projects = [];
const ipAddresses = localStorage.getItem("ipaddresses") ? JSON.parse(localStorage.getItem("ipaddresses")) : [];

tevent.listen('cpu_mem_sync', (event) => {
  console.log(event.payload);

  syncStatusChart.options.barColor = event.payload.catchup == "true" ? "#0F62FE" : event.payload.catchup == "false" ? "#43BE66" : "#FF2632";
  syncStatusChartPercent.textContent = event.payload.catchup == "true" || event.payload.catchup == "false" ? event.payload.height : "!";
  syncStatusChartPopupText.innerText = event.payload.catchup == "true" ? "Syncing...\n\nCurrent Block:\n" + event.payload.height : event.payload.catchup == "false" ? "Synced!\n\nCurrent Block:\n" + event.payload.height : "Can't get sync status!";
  if (event.payload.catchup == "true") {
    setTimeout(() => {
      syncStatusChart.update(100);
      setTimeout(() => {
        syncStatusChart.update(0);
      }, 2300);
    }, 2300);
  } else {
    syncStatusChart.update(100);
  }

  if (event.payload.cpu < 100) {
    cpuStatusChart.update(Math.floor(event.payload.cpu));
    cpuStatusChartPercent.textContent = Math.floor(event.payload.cpu) + "%";
  }
  memStatusChart.update(Math.floor(event.payload.mem));
  memStatusChartPercent.textContent = Math.floor(event.payload.mem) + "%";

  const eachSidebarTag = document.querySelectorAll(".each-sidebar-tag");
  if (event.payload.status == "active") {
    eachSidebarTag[0].classList.remove("sidebar-inactive-tag");
    eachSidebarTag[0].classList.add("sidebar-active-tag");
    eachSidebarTag[0].textContent = "Active";
  } else {
    eachSidebarTag[0].classList.add("sidebar-inactive-tag");
    eachSidebarTag[0].classList.remove("sidebar-active-tag");
    eachSidebarTag[0].textContent = event.payload.status.charAt(0).toUpperCase() + event.payload.status.slice(1);
  }
  if (event.payload.version) {
    eachSidebarTag[1].textContent = "Version " + event.payload.version;
    eachSidebarTag[1].classList.add("version-tag");
  }
});

// for login page
async function getProjectsFromApi() {
  const client = await http.getClient();
  const authenticate = await client.post('https://admin.node101.io/api/authenticate', {
    type: 'Json',
    payload: { key: "b8737b4ca31571d769506c4373f5c476e0a022bf58d5e0595c0e37eabb881ad150b8c447f58d5f80f6ffe5ced6f21fe0502c12cf32ab33c6f0787aea5ccff153" },
  });

  for (let count = 0; ; count++) {
    projects_data = await client.get(`https://admin.node101.io/api/projects?page=${count}`, {
      type: 'Json',
      headers: {
        'Cookie': authenticate.headers['set-cookie']
      }
    })
    if (!projects_data.data.projects.length) break;
    projects.push(...projects_data.data.projects);
  }
  hideLoadingAnimation();
  document.querySelector(".all-login-wrapper").setAttribute("style", "display: unset;");
}
function showSelectedItem(ip, icon) {
  const ipInputEl = document.getElementById("ip-input");
  const selectedItemEl = document.getElementById("selected-item");

  ipInputEl.value = ip
  ipInputEl.setAttribute("style", "display: none;");
  selectedItemEl.setAttribute("style", "display: flex;");
  selectedItemEl.children[0].setAttribute("src", projects.find(project => project.name == icon) ? projects.find(project => project.name == icon).image : "assets/default.png");
  selectedItemEl.children[1].textContent = icon;
  selectedItemEl.children[2].textContent = ip;
}
function highlightItem(x) {
  if (x.length > 1) {
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
    focusedIndex = (focusedIndex + x.length - 2) % (x.length - 1) + 1;
    x[focusedIndex].classList.add("autocomplete-active");
  }
}

// for node page
async function changePage(page, callback) {
  document.getElementById("content-of-page").innerHTML = await (await fetch(page)).text();
  if (callback) {
    callback();
  }
}
async function createWallet(walletname) {
  document.querySelectorAll(".each-input-field")[0].value = "";
  await tauri.invoke("create_wallet", { walletname: walletname }).then(async (mnemonic) => {
    dialog.message(JSON.parse(mnemonic).mnemonic, { title: "Keep your mnemonic private and secure. It's the only way to acces your wallet.", type: "info" });
  });
  await showWallets();
}
async function showWallets() {
  let walletList = document.getElementById("page-wallet-list");
  await tauri.invoke("show_wallets").then((list) => {
    list = list.length ? JSON.parse(list) : [];
    walletList.innerHTML = list.length ? "" : `<div class="each-row">No wallets found.</div>`;

    let adet = list.length;
    while (adet > 0) {
      row = document.createElement("div");
      row.setAttribute("class", "each-row");

      tekrar = adet == 1 ? 1 : 2;
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
          clipboard.writeText(this.previousSibling.title);
          dialog.message("Copied to clipboard.", { title: "Success", type: "success" });
        });

        path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path1.setAttribute("d", "M14.0555 7.35L11.0055 4.3C10.8555 4.1 10.6055 4 10.3555 4H6.35547C5.80547 4 5.35547 4.45 5.35547 5V14C5.35547 14.55 5.80547 15 6.35547 15H13.3555C13.9055 15 14.3555 14.55 14.3555 14V8.05C14.3555 7.8 14.2555 7.55 14.0555 7.35ZM10.3555 5L13.3055 8H10.3555V5ZM6.35547 14V5H9.35547V8C9.35547 8.55 9.80547 9 10.3555 9H13.3555V14H6.35547Z M3.35547 9H2.35547V2C2.35547 1.45 2.80547 1 3.35547 1H10.3555V2H3.35547V9Z");

        outputfieldicondelete = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        outputfieldicondelete.setAttribute("class", "each-output-field-icon-delete");
        outputfieldicondelete.setAttribute("viewBox", "0 0 17 16");
        outputfieldicondelete.addEventListener("click", async function () {
          if (await dialog.ask("This action cannot be reverted. Are you sure?", { title: "Delete Wallet", type: "warning" })) {
            showLoadingAnimation();
            await tauri.invoke("delete_wallet", { walletname: this.parentNode.previousSibling.textContent });
            await showWallets();
            hideLoadingAnimation();
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
  });
}
async function endInstallation() {
  document.querySelectorAll(".each-progress-bar-status-icon")[0].setAttribute("style", "display: unset;")
  document.querySelector(".progress-bar").setAttribute("value", "100");
  document.querySelector(".progress-bar-text-right").textContent = "100%";
  sessionStorage.setItem("keyring", `{ "required": ${await tauri.invoke("if_password_required")}, "exists": ${await tauri.invoke("if_keyring_exist")} }`);
  tauri.invoke("cpu_mem_sync");
}
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
  document.querySelectorAll(".each-button")[0].addEventListener("click", async function () {
    showLoadingAnimation();
    const walletname = document.querySelectorAll(".each-input-field")[0].value;
    if (await tauri.invoke("if_wallet_exists", { walletname: walletname })) {
      if (await dialog.ask("This action will override the existing wallet. Are you sure?", { title: "Override Wallet", type: "warning" })) {
        await tauri.invoke("delete_wallet", { walletname: walletname });
        await createWallet(walletname);
      }
    }
    else {
      await createWallet(walletname);
    }
    hideLoadingAnimation();
  });
  document.querySelectorAll(".each-button")[1].addEventListener("click", async function () {
    showLoadingAnimation();
    const walletname = document.querySelectorAll(".each-input-field")[1].value;
    const mnemonic = Array.from(document.querySelectorAll(".each-mnemonic-input-field")).map(input => input.value).join(" ");
    if (await tauri.invoke("if_wallet_exists", { walletname: walletname })) {
      if (await dialog.ask("This action will override the existing wallet. Are you sure?", { title: "Override Wallet", type: "warning" })) {
        await tauri.invoke("delete_wallet", { walletname: walletname });
        await tauri.invoke("recover_wallet", { walletname: walletname, mnemo: mnemonic, passwordneed: JSON.parse(sessionStorage.getItem("keyring")).required });
      }
    } else {
      await tauri.invoke("recover_wallet", { walletname: walletname, mnemo: mnemonic, passwordneed: JSON.parse(sessionStorage.getItem("keyring")).required });
    }
    await showWallets();
    hideLoadingAnimation();
  });
}
function walletsLoginSetup() {
  document.querySelector(".each-input-helper-text").addEventListener("click", async () => {
    if (await dialog.ask("This action will delete all the wallets. Are you sure you want to continue?", { title: "Reset Keyring", type: "warning" })) {
      await tauri.invoke("delete_keyring");
      sessionStorage.setItem("keyring", '{"required": true, "exists": false}');
      await changePage("page-content/wallets-create-keyring.html", createKeyringSetup);
    }
  });
  document.querySelector(".each-button").addEventListener("click", async () => {
    showLoadingAnimation();
    if (await tauri.invoke("check_wallet_password", { passw: document.querySelectorAll(".each-input-field")[0].value })) {
      await changePage("page-content/wallets.html", walletsSetup);
      await showWallets();
    }
    else {
      dialog.message("", { title: "Wrong password.", type: "error" });
    }
    hideLoadingAnimation();
  });
}
function createKeyringSetup() {
  const keyringWarning = document.getElementById("create-keyring-warning");
  const keyringWarningText = document.getElementById("create-keyring-warning-text");
  document.querySelector(".each-button").addEventListener("click", async () => {
    if (document.querySelectorAll(".each-input-field")[0].value !== document.querySelectorAll(".each-input-field")[1].value) {
      keyringWarning.setAttribute("style", "display: flex;");
      keyringWarning.classList.add("warning-animation");
      setTimeout(() => {
        keyringWarning.classList.remove("warning-animation");
      }, 500);
      keyringWarningText.textContent = "Passphrases do not match.";
    }
    else if (document.querySelectorAll(".each-input-field")[0].value.length < 8) {
      keyringWarning.setAttribute("style", "display: flex;");
      keyringWarning.classList.add("warning-animation");
      setTimeout(() => {
        keyringWarning.classList.remove("warning-animation");
      }, 500);
      keyringWarningText.textContent = "Passphrase must be at least 8 characters.";
    }
    else {
      showLoadingAnimation();
      await tauri.invoke("create_keyring", { passphrase: document.querySelector(".each-input-field").value });
      sessionStorage.setItem("keyring", '{"required": true, "exists": true}');
      await changePage("page-content/wallets-login.html", walletsLoginSetup);
      hideLoadingAnimation();
    }
  });
}
function nodeOperationSetup() {
  document.querySelectorAll(".each-page-manage-node-button")[0].addEventListener("click", async () => {
    tauri.invoke("start_stop_restart_node", { action: "start" });
  });
  document.querySelectorAll(".each-page-manage-node-button")[1].addEventListener("click", async () => {
    tauri.invoke("start_stop_restart_node", { action: "stop" });
  });
  document.querySelectorAll(".each-page-manage-node-button")[2].addEventListener("click", async () => {
    tauri.invoke("start_stop_restart_node", { action: "restart" });
  });
  document.querySelectorAll(".each-page-manage-node-button")[3].addEventListener("click", async () => {
    tauri.invoke("update_node");
  });
  document.querySelector(".delete-node-button").addEventListener("click", async () => {
    if (await dialog.ask("This action cannot be reverted. Are you sure?", { title: "Delete Node", type: "warning" })) {
      showLoadingAnimation();
      tauri.invoke("delete_node").then(() => {
        tauri.invoke("cpu_mem_sync_stop");
        currentIp.icon = "";
        localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses.map((ip) => {
          return ip.ip === currentIp.ip ? { ...ip, icon: "Empty Server" } : ip;
        })));
        setTimeout(() => {
          dialog.message("Node deleted successfully.", { title: "Success", type: "success" });
          loadHomePage();
        }, 1000);
      });
    }
  });
}

// for home page
async function showTestnetProjects() {
  const testnetTabContent = document.getElementById('testnet-tab-content');
  testnetTabContent.innerHTML = "";
  let gonnaPrepend = "";

  for (let i = 0; i < projects.length; i++) {
    row = document.createElement("div");
    row.setAttribute("class", "each-node-page-project");
    header = document.createElement("div");
    header.setAttribute("class", "project-header");
    headerIcon = document.createElement("img");
    headerIcon.setAttribute("class", "project-icon");
    headerIcon.setAttribute("src", projects[i].image);
    header.appendChild(headerIcon);
    details = document.createElement("div");
    details.setAttribute("class", "project-details")
    detailsHeading = document.createElement("div");
    detailsHeading.setAttribute("class", "project-details-heading");
    detailsHeading.textContent = projects[i].name;
    detailsTags = document.createElement("div");
    detailsTags.setAttribute("class", "project-details-tags");
    detailsTagsSpan1 = document.createElement("span");
    // detailsTagsSpan1.setAttribute("class","each-project-detail-tag upcoming-tag");
    // detailsTagsSpan1.textContent = "Upcoming";
    detailsTagsSpan1.setAttribute("class", "each-project-detail-tag incentivized-tag");
    detailsTagsSpan1.textContent = "Incentivized";
    detailsTagsSpan2 = document.createElement("span");
    detailsTagsSpan2.setAttribute("class", "each-project-detail-tag active-tag");
    detailsTagsSpan2.textContent = "Active";
    detailsTags.appendChild(detailsTagsSpan1);
    detailsTags.appendChild(detailsTagsSpan2);
    rating = document.createElement("div");
    rating.setAttribute("class", "project-rating");
    ratingHeading = document.createElement("div");
    ratingHeading.setAttribute("class", "project-rating-heading");
    ratingHeading.textContent = "Rating"
    rating.appendChild(ratingHeading);
    ratingScore = projects[i].rating;

    for (let j = 0; j < 5; j++) {
      ratingCircle = document.createElement("span");
      ratingCircle.setAttribute("class", "each-project-rating-value");
      ratingCircleOn = document.createElement("span");
      ratingCircleOn.setAttribute("class", "each-project-rating-value-on");
      if (ratingScore != 0) {
        ratingCircleOn.setAttribute("style", "display: unset;");
        ratingScore = ratingScore - 1;
      } else {
        ratingCircleOn.setAttribute("style", "display: none;");
      }
      ratingCircle.appendChild(ratingCircleOn);
      rating.appendChild(ratingCircle);
    }

    details.appendChild(detailsHeading);
    details.appendChild(detailsTags);
    details.appendChild(rating);
    header.appendChild(details);
    row.appendChild(header);
    description = document.createElement("div");
    description.setAttribute("class", "project-description");
    description.textContent = projects[i].description;
    row.appendChild(description);
    buttons = document.createElement("div");
    buttons.setAttribute("class", "project-buttons");
    installButton = document.createElement("button");
    installButton.setAttribute("class", "each-project-button install-button");
    textDiv = document.createElement("div");
    textDiv.textContent = "Install Node";
    installButtonSVG = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    installButtonSVG.setAttribute("class", "each-project-button-svg");
    installButtonSVG.setAttribute("width", "14");
    installButtonSVG.setAttribute("height", "14");
    installButtonSVG.setAttribute("viewBox", "0 0 14 14");
    path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path1.setAttribute("d", "M 12.656854,8.1649583 11.949748,7.4578515 7.4985105,11.909089 V 0.17818725 H 6.5014899 V 11.909089 L 2.0502527,7.4578515 1.343146,8.1649583 7.0000002,13.821813 Z");
    installButtonSVG.appendChild(path1);
    installButton.appendChild(textDiv);
    installButton.appendChild(installButtonSVG)
    installButton.addEventListener("click", async function () {
      if (await dialog.confirm("Node is going to be installed, please confirm.", projects[i].name)) {
        sessionStorage.setItem("installation", "true");
        currentIp.icon = projects[i].name;
        loadNodePage();
      }
    });
    discoverButton = document.createElement("button");
    discoverButton.setAttribute("class", "each-project-button discover-button");
    textDiv2 = document.createElement("div");
    textDiv2.textContent = "Discover";
    discoverButtonSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    discoverButtonSVG.setAttribute("class", "each-project-button-svg");
    discoverButtonSVG.setAttribute("width", "10");
    discoverButtonSVG.setAttribute("height", "10");
    discoverButtonSVG.setAttribute("viewBox", "0 0 10 10");
    path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute("d", "M2 0V1H8.295L0 9.295L0.705 10L9 1.705V8H10V0H2Z");
    discoverButtonSVG.appendChild(path2);
    discoverButton.appendChild(textDiv2);
    discoverButton.appendChild(discoverButtonSVG)
    buttons.appendChild(installButton);
    buttons.appendChild(discoverButton);
    row.appendChild(buttons);
    testnetTabContent.appendChild(row);
    console.log(projects[i].name);
    if (projects[i].name == currentIp.icon) {
      gonnaPrepend = row;
    }
  }
  if (gonnaPrepend) {
    testnetTabContent.prepend(gonnaPrepend);
    document.querySelector(".install-button").replaceWith(document.querySelector(".install-button").cloneNode(true));
    document.querySelector(".install-button").addEventListener("click", function () {
      document.querySelector(".all-home-wrapper").setAttribute("style", "display: none;");
      document.querySelector(".all-node-wrapper").setAttribute("style", "display: flex;");
      tauri.invoke("cpu_mem_sync");
    });
    document.querySelector(".install-button").firstChild.textContent = "Manage Node";
    document.querySelector(".install-button").firstChild.nextSibling.setAttribute("style", "transform: rotate(-90deg);");
    for (let i = 1; i < document.querySelectorAll(".install-button").length; i++) {
      document.querySelectorAll(".install-button")[i].disabled = true;
    }
  }
}

// for all pages
function loadLoginPage() {
  document.querySelector(".all-header-wrapper").setAttribute("style", "display: none;");
  document.querySelector(".all-login-wrapper").setAttribute("style", "display: unset;");
  document.querySelector(".all-node-wrapper").setAttribute("style", "display: none;");
  document.querySelector(".all-home-wrapper").setAttribute("style", "display: none;");
  hideLoadingAnimation();
}
function loadHomePage() {
  updateHeader();

  showTestnetProjects();

  document.querySelector(".all-header-wrapper").setAttribute("style", "display: flex;");
  document.querySelector(".all-login-wrapper").setAttribute("style", "display: none;");
  document.querySelector(".all-node-wrapper").setAttribute("style", "display: none;");
  document.querySelector(".all-home-wrapper").setAttribute("style", "display: flex;");
  hideLoadingAnimation();
}
async function loadNodePage() {
  updateHeader();

  document.querySelector(".all-header-wrapper").setAttribute("style", "display: flex;");
  document.querySelector(".all-login-wrapper").setAttribute("style", "display: none;");
  document.querySelector(".all-node-wrapper").setAttribute("style", "display: unset;");
  document.querySelector(".all-home-wrapper").setAttribute("style", "display: none;");

  document.querySelector(".sidebar-info-details-name").textContent = currentIp.icon;
  document.querySelector(".sidebar-info-icon").setAttribute("src", currentIp.icon ? projects.find(item => item.name == currentIp.icon).image : "assets/default.png");

  document.querySelector(".all-node-wrapper").setAttribute("style", "display: unset;");
  if (sessionStorage.getItem("installation") == "true") {
    sessionStorage.setItem("installation", "false");
    localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses.map((ip) => {
      return ip.ip === currentIp.ip ? { ...ip, icon: currentIp.icon } : ip;
    })));
    tauri.invoke("install_node");
    await changePage("page-content/installation.html");
    for (let i = 0; i < 100; i++) {
      if (document.querySelectorAll(".each-progress-bar-status-icon") && document.querySelectorAll(".each-progress-bar-status-icon")[0].getAttribute("style") == "display: unset;") {
        break;
      }
      document.querySelector(".progress-bar").setAttribute("value", i);
      document.querySelector(".progress-bar-text-right").textContent = `${i}%`;
      await new Promise(r => setTimeout(r, i * i / 0.015));
    }
  }
  else {
    await changePage("page-content/node-operations.html", nodeOperationSetup);
    sessionStorage.setItem("keyring", `{ "required": ${await tauri.invoke("if_password_required")}, "exists": ${await tauri.invoke("if_keyring_exist")} }`);
    tauri.invoke("cpu_mem_sync");
  }
  hideLoadingAnimation();
}

window.addEventListener("DOMContentLoaded", async () => {
  const ipInputEl = document.getElementById("ip-input");
  const passwordInputEl = document.getElementById("password-input");
  const autocompleteListEl = document.getElementById("ip-input-autocomplete-list");
  const dropdownToggleEl = document.querySelectorAll(".each-login-page-toggle")[0];
  const visibilityToggleEl1 = document.querySelectorAll(".each-login-page-toggle")[1];
  const visibilityToggleEl2 = document.querySelectorAll(".each-login-page-toggle")[2];
  const selectedItemEl = document.getElementById("selected-item");
  const loginButtonEl = document.querySelector(".login-page-login-button");
  const checkboxInputEl = document.getElementById("checkbox-input");
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
  const testnetTabButton = document.getElementById("testnet-tab-button");
  const mainnetTabButton = document.getElementById("mainnet-tab-button");
  const testnetTabContent = document.getElementById("testnet-tab-content");
  const mainnetTabContent = document.getElementById("mainnet-tab-content");
  const nodeIcons = document.querySelector(".header-node-icons");
  const headerMenu = document.querySelector(".header-menu");
  const submenuIpList = document.querySelector(".header-submenu-ip-list");
  const submenuNotifications = document.querySelector(".header-submenu-notifications");
  const scrollbarBackground = document.querySelector(".header-menu-scroll-background");
  const headerMenuIpButton = document.querySelector(".header-menu-ip-list-button");
  const notificationsButton = document.getElementById("notifications-button");
  const logoutButton = document.getElementById("logout-button");
  const warningEl = document.querySelector(".warning");

  getProjectsFromApi();

  // login page
  new MutationObserver(() => {
    dropdownToggleEl.setAttribute("style", autocompleteListEl.innerHTML == "" ? "transform: rotate(0); transition: 0.5s;" : "transform: rotateX(-180deg); transition: 0.5s;");
  }).observe(autocompleteListEl, { childList: true });
  visibilityToggleEl1.addEventListener("click", function () {
    passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
    visibilityToggleEl1.setAttribute("style", visibilityToggleEl1.style.display == "none" ? "display: unset;" : "display: none;");
    visibilityToggleEl2.setAttribute("style", visibilityToggleEl2.style.display == "none" ? "display: unset;" : "display: none;");
  });
  visibilityToggleEl2.addEventListener("click", function () {
    passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
    visibilityToggleEl1.setAttribute("style", visibilityToggleEl1.style.display == "none" ? "display: unset;" : "display: none;");
    visibilityToggleEl2.setAttribute("style", visibilityToggleEl2.style.display == "none" ? "display: unset;" : "display: none;");
  });
  ipInputEl.addEventListener("keydown", function (e) {
    x = document.querySelectorAll(".each-autocomplete-item");
    if (e.keyCode == 40) {
      focusedIndex++;
      highlightItem(x);
    }
    else if (e.keyCode == 38) {
      focusedIndex--;
      highlightItem(x);
    }
    else if (e.keyCode == 13 && focusedIndex > -1) {
      x[focusedIndex].click();
    }
  });
  ipInputEl.addEventListener("input", function () {
    autocompleteListEl.innerHTML = "";
    focusedIndex = 0;
    for (let i = 0; i < ipAddresses.length; i++) {
      if (ipAddresses[i].ip.toLowerCase().includes(ipInputEl.value.toLowerCase()) || ipAddresses[i].icon.toLowerCase().includes(ipInputEl.value.toLowerCase())) {
        div = document.createElement("div");
        div.setAttribute("class", "each-autocomplete-item");
        div.addEventListener("click", function () {
          showSelectedItem.call(this, ipAddresses[i].ip, ipAddresses[i].icon);
        });
        img = document.createElement("img");
        img.setAttribute("class", "each-autocomplete-item-icon");
        img.setAttribute("src", projects.find(project => project.name == ipAddresses[i].icon) ? projects.find(project => project.name == ipAddresses[i].icon).image : "assets/default.png");
        div1 = document.createElement("div");
        div1.textContent = ipAddresses[i].icon;
        div2 = document.createElement("div");
        div2.setAttribute("class", "each-autocomplete-item-ip");
        div2.textContent = ipAddresses[i].ip;
        div.appendChild(img);
        div.appendChild(div1);
        div.appendChild(div2);
        autocompleteListEl.appendChild(div);
      }
    }
  });
  selectedItemEl.addEventListener("click", function () {
    selectedItemEl.setAttribute("style", "display: none;");
    ipInputEl.setAttribute("style", "display: unset;");
    ipInputEl.focus();
  });
  loginButtonEl.addEventListener("click", function () {
    if (ipInputEl.value == "" || passwordInputEl.value == "") {
      warningEl.setAttribute("style", "display: flex;");
      warningEl.classList.add("warning-animation");
      setTimeout(() => {
        warningEl.classList.remove("warning-animation");
      }, 500);
      return;
    }
    showLoadingAnimation();
    tauri.invoke("log_in", {
      ip: ipInputEl.value,
      password: "node101bos", // passwordInputEl.value
    }).then((res) => {
      if (res[0]) {
        warningEl.setAttribute("style", "display: none;");
        const found = projects.reduce((acc, project) => {
          if (project.wizard_key !== null) {
            acc.push(project.wizard_key);
          }
          return acc;
        }, []).find(item => item === res[1]);

        currentIp = ipAddresses.find(ip => ip.ip === ipInputEl.value);
        if (currentIp) {
          currentIp.icon = res[1] ? projects.find(item => item.wizard_key === found).name : "";
        } else if (checkboxInputEl.checked) {
          ipAddresses.push({ ip: ipInputEl.value, icon: res[1] ? projects.find(item => item.wizard_key === found).name : "" });
          currentIp = ipAddresses.find(ip => ip.ip === ipInputEl.value);
        }
        localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
        document.querySelector(".selected-item-modify").click();
        ipInputEl.value = "";
        passwordInputEl.value = "";
        if (found) {
          loadNodePage();
        } else {
          loadHomePage();
        }
      }
      else {
        warningEl.setAttribute("style", "display: flex;");
        warningEl.classList.add("warning-animation");
        setTimeout(() => {
          warningEl.classList.remove("warning-animation");
        }, 500);
        hideLoadingAnimation();
      }
    });
  });

  // header menu
  nodeIcons.addEventListener('click', function () {
    if (headerMenu.style.display == "block") {
      headerMenu.setAttribute("style", "display: none;");
      submenuIpList.setAttribute("style", "display: none;");
      submenuNotifications.setAttribute("style", "display: none;");
      scrollbarBackground.setAttribute("style", "display: none;");
    }
    else {
      headerMenu.setAttribute("style", "display: block;");
    }
  });
  headerMenuIpButton.addEventListener('click', function () {
    submenuNotifications.setAttribute("style", "display: none;");
    submenuIpList.innerHTML = "";
    for (let i = 0; i < ipAddresses.length; i++) {
      ipListItem = document.createElement("div");
      ipListItem.setAttribute("class", "each-header-submenu-ip-list-item");
      ipListItemIcon = document.createElement("img");
      ipListItemIcon.setAttribute("src", projects.find(project => project.name == ipAddresses[i].icon) ? projects.find(project => project.name == ipAddresses[i].icon).image : "");
      ipListItemIcon.setAttribute("class", "each-header-submenu-ip-list-item-icon");
      ipListItemName = document.createElement("div");
      ipListItemName.setAttribute("class", "each-header-submenu-ip-list-item-name");
      ipListItemName.innerText = ipAddresses[i].icon == "" ? "Empty Server" : ipAddresses[i].icon;
      ipListItemIp = document.createElement("div");
      ipListItemIp.setAttribute("class", "each-header-submenu-ip-list-item-ip");
      ipListItemIp.innerText = ipAddresses[i].ip;
      ipAddresses[i].icon == "" ? ipListItemIcon.setAttribute("style", "display: none;") : ipListItem.appendChild(ipListItemIcon);
      ipListItem.appendChild(ipListItemName);
      ipListItem.appendChild(ipListItemIp);
      ipListItem.addEventListener("click", () => {
        createPasswordPrompt(ipAddresses[i].ip);
      });
      submenuIpList.appendChild(ipListItem);
    }
    if (submenuIpList.style.display == "block") {
      submenuIpList.setAttribute("style", "display: none;");
      scrollbarBackground.setAttribute("style", "display: none;");
    }
    else {
      submenuIpList.setAttribute("style", "display: block;");
      scrollbarBackground.setAttribute("style", `display: block; height: ${Math.min(ipAddresses.length, 3) * 60}px;`);
    }
  });
  notificationsButton.addEventListener('click', function () {
    submenuIpList.setAttribute("style", "display: none;");
    submenuNotifications.innerHTML = "";
    const notifications = localStorage.getItem("notifications") ? JSON.parse(localStorage.getItem("notifications")) : [];
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
    localStorage.setItem("notifications", JSON.stringify(notifications.map((notification) => {
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
  });
  logoutButton.addEventListener('click', function () {
    showLoadingAnimation();
    tauri.invoke("cpu_mem_sync_stop");
    setTimeout(() => {
      tauri.invoke("log_out");
      loadLoginPage();
    }, 1000);
  });

  // node page
  syncStatusChart = new EasyPieChart(document.querySelectorAll(".each-page-chart")[0], {
    size: 160,
    barColor: "rgba(15, 98, 254, 1)",
    scaleLength: 0,
    lineWidth: 6,
    trackColor: "#373737",
    lineCap: "circle",
    animate: 2000,
  });
  syncStatusChartPercent = document.querySelectorAll(".each-page-chart-percentage")[0];
  syncStatusChartPopupText = document.querySelector(".each-page-chart-text-pop-up");
  cpuStatusChart = new EasyPieChart(document.querySelectorAll(".each-page-chart")[1], {
    size: 160,
    barColor: "rgba(15, 98, 254, 1)",
    scaleLength: 0,
    lineWidth: 6,
    trackColor: "#373737",
    lineCap: "circle",
    animate: 2000,
  });
  cpuStatusChartPercent = document.querySelectorAll(".each-page-chart-percentage")[1];
  memStatusChart = new EasyPieChart(document.querySelectorAll(".each-page-chart")[2], {
    size: 160,
    barColor: "rgba(15, 98, 254, 1)",
    scaleLength: 0,
    lineWidth: 6,
    trackColor: "#373737",
    lineCap: "circle",
    animate: 2000,
  });
  memStatusChartPercent = document.querySelectorAll(".each-page-chart-percentage")[2];
  validatorAddress.addEventListener("click", function () {
    clipboard.writeText(validatorAddressText.innerText);
    dialog.message("Copied to clipboard.", { title: "Success", type: "success" });
  })
  homePageButton.addEventListener("click", function () {
    showLoadingAnimation();
    tauri.invoke("cpu_mem_sync_stop").then(() => {
      setTimeout(() => {
        loadHomePage();
      }, 1000);
    });
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
    if (JSON.parse(sessionStorage.getItem("keyring")).required) {
      if (JSON.parse(sessionStorage.getItem("keyring")).exists) {
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
    tauri.invoke("node_info").then(async (obj) => {
      if (!obj) {
        dialog.message("Node is not running.", { title: "Error", type: "error" });
      }
      else {
        await changePage("page-content/node-information.html");
        let fields = document.querySelectorAll(".each-output-field");
        obj = JSON.parse(obj);
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
      }
      hideLoadingAnimation();
    });

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
  });

  window.addEventListener("click", async (e) => {
    hideMenuWhenClickedOutside(e);
    if (e.target == dropdownToggleEl && !autocompleteListEl.innerHTML) {
      ipInputEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
    else {
      autocompleteListEl.innerHTML = "";
    }
  });
});