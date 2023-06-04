tevent.listen("cpu_mem_sync", (event) => {
    try {
        response = JSON.parse(event.payload);
        console.log(response);
    } catch (e) {
        console.log("error parsing: ", event.payload);
        return;
    };

    syncStatusChart.options.barColor = response.catchup == "true" ? "#0F62FE" : response.catchup == "false" ? "#43BE66" : "#FF2632";
    syncStatusChartPercent.textContent = response.catchup == "true" || response.catchup == "false" ? response.height : "!";
    syncStatusChartPopupText.innerText = response.catchup == "true" ? "Syncing...\n\nCurrent Block: " + response.height : response.catchup == "false" ? "Node is synced!" : "Can't get sync status!";
    if (response.catchup == "true") {
        setTimeout(() => {
            syncStatusChart.update(100);
            setTimeout(() => {
                syncStatusChart.update(0);
            }, 2300);
        }, 2300);
    } else {
        syncStatusChart.update(100);
    };

    if (response.cpu < 100) {
        cpuStatusChart.update(Math.floor(response.cpu));
        cpuStatusChartPercent.textContent = Math.floor(response.cpu) + "%";
    };
    memStatusChart.update(Math.floor(response.mem));
    memStatusChartPercent.textContent = Math.floor(response.mem) + "%";

    const eachSidebarTag = document.querySelectorAll(".each-sidebar-tag");
    if (response.status == "active") {
        if (node_action == "start" || node_action == "restart") {
            node_action = "";
            document.body.classList.remove("waiting");
        };
        eachSidebarTag[0].classList.remove("sidebar-inactive-tag");
        eachSidebarTag[0].classList.add("sidebar-active-tag");
        eachSidebarTag[0].textContent = "Active";

        if (startNodeButton) {
            startNodeButton.disabled = true;
            stopNodeButton.disabled = false;
        };
    } else if (response.status == "") {
        eachSidebarTag[0].textContent = "Loading...";

        if (startNodeButton) {
            startNodeButton.disabled = false;
            stopNodeButton.disabled = true;
        };
    } else {
        if (node_action == "stop") {
            node_action = "";
            document.body.classList.remove("waiting");
        }
        eachSidebarTag[0].classList.add("sidebar-inactive-tag");
        eachSidebarTag[0].classList.remove("sidebar-active-tag");
        eachSidebarTag[0].textContent = response.status.charAt(0).toUpperCase() + response.status.slice(1);

        if (startNodeButton) {
            startNodeButton.disabled = false;
            stopNodeButton.disabled = true;
        };
    };
    if (response.version) {
        version_new = response.version.charAt(0).toLowerCase() == "v" ? response.version : "v" + response.version;
        if (version_new == latest_tag) {
            updateNodeButton.disabled = true;
            if (node_action == "update") {
                node_action = "";
                document.body.classList.remove("waiting");
            };
        } else {
            updateNodeButton.disabled = false;
        };
        eachSidebarTag[1].textContent = version_new;
        eachSidebarTag[1].classList.add("version-tag");
    };
});
tevent.listen("check_logs", (event) => {
    if (document.getElementById("logs-page-code-block")) {
        const codeBlock = document.getElementById("logs-page-code-block");

        event.payload = event.payload
            .replace(/INFO/g, "<span style='color: #43BE66;'>INFO</span>")
            .replace(/WARN/g, "<span style='color: #FFA800;'>WARN</span>")
            .replace(/ERROR/g, "<span style='color: #FF2632;'>ERROR</span>")
            .replace(/\n/g, "<br><br>") + "<br>";

        if (codeBlock.scrollHeight - codeBlock.scrollTop - codeBlock.clientHeight < 10) {
            codeBlock.innerHTML += event.payload;
            codeBlock.scrollTop = codeBlock.scrollHeight;
        } else {
            codeBlock.innerHTML += event.payload;
        };
    } else {
        tauri.invoke("stop_check_logs");
    }
});

const loadNodePage = async (start) => {
    const eachSidebarTag = document.querySelectorAll(".each-sidebar-tag");
    eachSidebarTag[0].setAttribute("class", "each-sidebar-tag sidebar-active-tag");
    eachSidebarTag[0].textContent = "Loading...";
    eachSidebarTag[1].setAttribute("class", "each-sidebar-tag version-tag");
    eachSidebarTag[1].textContent = "Loading...";

    updateHeader();
    updateSidebar();

    syncStatusChart.update(0);
    syncStatusChart.update(0);
    cpuStatusChart.update(0);
    cpuStatusChart.update(0);
    memStatusChart.update(0);
    memStatusChart.update(0);

    syncStatusChartPercent.textContent = "";
    cpuStatusChartPercent.textContent = "";
    memStatusChartPercent.textContent = "";

    document.querySelector(".all-installation-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".all-header-wrapper").setAttribute("style", "display: flex;");
    document.querySelector(".all-login-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".all-node-wrapper").setAttribute("style", "display: flex;");
    document.querySelector(".all-home-wrapper").setAttribute("style", "display: none;");

    if (currentIp.icon == "Celestia Light") {
        exception = "celestia-lightd";
    } else if (currentIp.icon == "Babylon") {
        exception = "babylon";
    } else {
        exception = "";
    };
    buttons_to_hide = ["node-information-button", "validator-list-button", "create-validator-button", "edit-validator-button", "withdraw-rewards-button", "delegate-token-button", "redelegate-token-button", "vote-button", "unjail-button", "send-token-button"];
    for (button of buttons_to_hide) {
        document.getElementById(button).style.display = currentIp.icon == "Celestia Light" ? "none" : "";
        document.getElementById(button).nextElementSibling.style.display = currentIp.icon == "Celestia Light" ? "none" : "";
    };

    if (start) {
        await tauri.invoke("password_keyring_check", { exception: exception }).then((res) => {
            sessionStorage.setItem("keyring", `{ "required": ${res[0]}, "exists": ${res[1]} }`);
        }).catch((err) => {
            console.log(err);
        });
        await changePage("page-content/node-operations.html", nodeOperationsSetup);
        tauri.invoke("cpu_mem_sync", { exception: exception }).catch(async (err) => { await handleTimeOut(err); });
    };
};
const changePage = async (page, callback) => {
    document.getElementById("content-of-page").innerHTML = await (await fetch(page)).text();
    if (callback) {
        await callback();
    };
};
const updateSidebar = async () => {
    document.querySelector(".sidebar-info-details-name").textContent = currentIp.icon;
    document.querySelector(".sidebar-info-icon").setAttribute("src", currentIp.icon ? projects.find(item => item.project.name == currentIp.icon).project.image : "assets/default.png");
    document.querySelector(".sidebar-info-details-copy").setAttribute("style", currentIp.validator_addr ? "display: flex;" : "display: none;");
    document.querySelector(".sidebar-info-details-copy-address").textContent = currentIp.validator_addr;
};
const ifWalletExists = async (walletname) => {
    const wallets = document.querySelectorAll(".each-output-group");
    for (let i = 0; i < wallets.length; i++) {
        if (wallets[i].previousSibling.textContent == walletname) {
            return true;
        };
    };
    return false;
};
const createWallet = async (walletname) => {
    const wallet_exists = await ifWalletExists(walletname);
    const proceed = !wallet_exists || await dialog.ask("This action will override the existing wallet. Are you sure?", { title: "Override Wallet", type: "warning" });
    if (proceed) {
        showLoadingAnimation();
        if (wallet_exists) {
            await tauri.invoke("delete_wallet", { walletname, exception }).catch(async (err) => { await handleTimeOut(err); });
        };
        await tauri.invoke("create_wallet", { walletname, exception })
            .then((mnemonic) => dialog.message(mnemonic, { title: "Keep your mnemonic private and secure. It's the only way to acces your wallet.", type: "info" }))
            .catch(async (err) => { await handleTimeOut(err); });
        await showWallets();
        document.querySelector(".each-input-field").value = "";
        hideLoadingAnimation();
    };
};
const recoverWallet = async (walletname) => {
    const wallet_exists = await ifWalletExists(walletname);
    const proceed = !wallet_exists || await dialog.ask("This action will override the existing wallet. Are you sure?", { title: "Override Wallet", type: "warning" });
    if (proceed) {
        showLoadingAnimation();
        const mnemonic = Array.from(document.querySelectorAll(".each-mnemonic-input-field")).map(input => input.value).join(" ");
        if (wallet_exists) {
            await tauri.invoke("delete_wallet", { walletname: walletname, exception: exception }).catch(async (err) => { await handleTimeOut(err); });
        };
        await tauri.invoke("recover_wallet", { walletname: walletname, mnemo: mnemonic, passwordneed: JSON.parse(sessionStorage.getItem("keyring")).required, exception: exception })
            .then((res) => { dialog.message("", { title: "Your wallet has been recovered successfully.", type: "info" }) })
            .catch(async (err) => { await handleTimeOut(err); });
        await showWallets();
        document.querySelectorAll(".each-input-field")[1].value = "";
        document.querySelectorAll(".each-mnemonic-input-field").forEach(input => input.value = "");
        hideLoadingAnimation();
    };
};
const showWallets = async () => {
    const walletList = document.getElementById("page-wallet-list");
    await tauri.invoke("show_wallets", { exception: exception }).then((list) => {
        appendlater = null;
        list = list.length ? JSON.parse(list) : [];
        list = list.filter(function (item) {
            return item.name !== "forkeyringpurpose";
        });

        walletList.innerHTML = list.length == 0 ? "<div class='each-row'>No wallets found.</div>" : "";
        count = list.length;
        while (count > 0) {
            row = document.createElement("div");
            row.setAttribute("class", "each-row");

            repeat = count == 1 ? 1 : 2;
            for (let i = 0; i < repeat; i++) {
                halfrow = document.createElement("div");
                halfrow.setAttribute("class", "each-row-half");

                label = document.createElement("div");
                label.setAttribute("class", "each-input-label");

                balancetext = "";
                if (list[count - i - 1].balance.balances.length) {
                    for (let m = 0; m < list[count - i - 1].balance.balances.length; m++) {
                        balancetext += parseInt((list[count - i - 1].balance.balances[m].amount / 1000000) * 100) / 100 + " " + list[count - i - 1].balance.balances[m].denom.slice(1) + "\n";
                    };
                } else {
                    balancetext = "No tokens found.";
                };
                label.textContent = list[count - i - 1].name;

                labelicon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                labelicon.setAttribute("class", "each-input-label-icon");
                labelicon.setAttribute("viewBox", "0 540 512 512");
                labelicon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                labeliconpath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                labeliconpath.setAttribute("d", "m 254.68748,594.11338 c -6.05679,0.26486 -12.01753,2.41912 -16.84422,6.08763 -4.82669,3.6685 -8.49798,8.83503 -10.37453,14.59987 l -33.78125,104 c -0.58664,1.80274 -2.09119,3.85463 -3.625,4.96875 -1.53374,1.11407 -3.97894,1.93705 -5.875,1.9375 l -109.343748,0 c -6.276311,0.01 -12.53359,2.05072 -17.608356,5.74381 -5.074765,3.69309 -8.941267,9.01942 -10.880568,14.98862 -1.939301,5.96919 -1.941559,12.55096 -0.0064,18.52149 1.935204,5.97052 5.79805,11.29951 10.87028,14.99608 l 88.437502,64.25 c 1.53524,1.11502 3.03898,3.19532 3.625,5 0.58601,1.80469 0.5873,4.38323 0,6.1875 -1e-5,0.0104 -1e-5,0.0208 0,0.0312 l -33.78121,103.9688 c -1.93395,5.97351 -1.92866,12.55805 0.0149,18.52845 1.94353,5.9704 5.81543,11.2963 10.89523,14.9866 5.0798,3.6904 11.34168,5.7264 17.62045,5.7293 6.27877,0 12.54252,-2.0274 17.6257,-5.7131 l 88.46875,-64.28125 c 1.53402,-1.11353 3.97943,-1.90625 5.875,-1.90625 1.89557,0 4.34098,0.79272 5.875,1.90625 l 88.46875,64.28125 c 5.08318,3.6857 11.34693,5.716 17.6257,5.7131 6.27877,0 12.54065,-2.0389 17.62045,-5.7293 5.0798,-3.6903 8.9517,-9.0162 10.89523,-14.9866 1.94354,-5.9704 1.94882,-12.55494 0.0149,-18.52845 L 362.71873,855.42588 c 1e-5,-0.0104 1e-5,-0.0208 0,-0.0312 -0.58723,-1.80392 -0.586,-4.38287 0,-6.1875 0.58602,-1.80468 2.08976,-3.88498 3.625,-5 l 88.4375,-64.25 c 5.07223,-3.69657 8.93508,-9.02556 10.87028,-14.99608 1.9352,-5.97053 1.93294,-12.5523 -0.006,-18.52149 -1.9393,-5.9692 -5.8058,-11.29553 -10.88056,-14.98862 -5.07477,-3.69309 -11.33205,-5.7342 -17.60836,-5.74381 l -109.3125,0 c -1.89577,-4.4e-4 -4.34116,-0.82336 -5.875,-1.9375 -1.5338,-1.11412 -3.03836,-3.16601 -3.625,-4.96875 l -33.8125,-104 c -2.01198,-6.18102 -6.09457,-11.66812 -11.4368,-15.37133 -5.34223,-3.70321 -11.91295,-5.60093 -18.40695,-5.31622 z");

                if (currentIp.validator_addr == list[count - i - 1].address) {
                    labelicon.style.fill = "var(--main-color)";
                    labelicon.addEventListener("click", () => {
                        dialog.message("This is your main wallet.", { title: "Main Wallet", type: "info" });
                    });
                    appendlater = halfrow;
                    labelicon.appendChild(labeliconpath);
                    label.appendChild(labelicon);
                } else if (exception == "celestia-lightd" || exception == "celestia-bridge") {
                    labelicon.addEventListener("click", async function () {
                        if (await dialog.ask("Do you want to set this wallet as your main wallet?", { title: "Set Main Wallet", type: "info" })) {
                            showLoadingAnimation();
                            currentIp.validator_addr = this.closest(".each-input-label").nextElementSibling.children[0].getAttribute("data");
                            await tauri.invoke("set_main_wallet", { walletname: this.parentNode.textContent, address: currentIp.validator_addr, exception: exception }).catch((err) => { console.log(err); });
                            await updateSidebar();
                            localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                            await showWallets();
                            hideLoadingAnimation();
                        };
                    });
                    labelicon.appendChild(labeliconpath);
                    label.appendChild(labelicon);
                };

                outputgroup = document.createElement("div");
                outputgroup.setAttribute("class", "each-output-group");
                outputfieldpopup = document.createElement("div");
                outputfieldpopup.setAttribute("class", "each-output-field-pop-up");
                outputfieldpopup.innerText = balancetext;

                outputfield = document.createElement("div");
                outputfield.setAttribute("class", "each-output-field");
                outputfield.textContent = list[count - i - 1].address.substring(0, 4) + "..." + list[count - i - 1].address.substring(list[count - i - 1].address.length - 4);
                outputfield.setAttribute("data", list[count - i - 1].address);

                outputfieldiconcopy = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                outputfieldiconcopy.setAttribute("class", "each-output-field-icon-copy");
                outputfieldiconcopy.setAttribute("viewBox", "0 0 17 16");
                outputfieldiconcopy.addEventListener("click", function () {
                    clipboard.writeText(this.previousSibling.previousSibling.getAttribute("data"));
                    saveforlater = this.previousSibling.previousSibling.textContent;
                    this.previousSibling.previousSibling.textContent = "Copied!";
                    setTimeout(() => {
                        this.previousSibling.previousSibling.textContent = saveforlater;
                    }, 1000);
                });

                path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path1.setAttribute("d", "M14.0555 7.35L11.0055 4.3C10.8555 4.1 10.6055 4 10.3555 4H6.35547C5.80547 4 5.35547 4.45 5.35547 5V14C5.35547 14.55 5.80547 15 6.35547 15H13.3555C13.9055 15 14.3555 14.55 14.3555 14V8.05C14.3555 7.8 14.2555 7.55 14.0555 7.35ZM10.3555 5L13.3055 8H10.3555V5ZM6.35547 14V5H9.35547V8C9.35547 8.55 9.80547 9 10.3555 9H13.3555V14H6.35547Z M3.35547 9H2.35547V2C2.35547 1.45 2.80547 1 3.35547 1H10.3555V2H3.35547V9Z");

                outputfieldicondelete = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                outputfieldicondelete.setAttribute("class", "each-output-field-icon-delete");
                outputfieldicondelete.setAttribute("viewBox", "0 0 17 16");
                outputfieldicondelete.addEventListener("click", async function () {
                    if (await dialog.ask("This action cannot be reverted. Are you sure?", { title: "Delete Wallet", type: "warning" })) {
                        showLoadingAnimation();
                        if (this.previousSibling.previousSibling.previousSibling.getAttribute("data") == document.querySelector(".sidebar-info-details-copy-address").textContent) {
                            document.querySelector(".sidebar-info-details-copy-address").textContent = "";
                            document.querySelector(".sidebar-info-details-copy").setAttribute("style", "display: none;");
                        };
                        await tauri.invoke("delete_wallet", { walletname: this.parentNode.previousSibling.textContent, exception: exception }).catch((err) => { console.log(err); });
                        await showWallets();
                        hideLoadingAnimation();
                    };
                });

                path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path2.setAttribute("d", "M7.35547 6H6.35547V12H7.35547V6Z M10.3555 6H9.35547V12H10.3555V6Z M2.35547 3V4H3.35547V14C3.35547 14.2652 3.46083 14.5196 3.64836 14.7071C3.8359 14.8946 4.09025 15 4.35547 15H12.3555C12.6207 15 12.875 14.8946 13.0626 14.7071C13.2501 14.5196 13.3555 14.2652 13.3555 14V4H14.3555V3H2.35547ZM4.35547 14V4H12.3555V14H4.35547Z M10.3555 1H6.35547V2H10.3555V1Z");

                outputfieldiconcopy.appendChild(path1);
                outputfieldicondelete.appendChild(path2);
                outputgroup.appendChild(outputfield);
                outputgroup.appendChild(outputfieldpopup);
                outputgroup.appendChild(outputfieldiconcopy);
                outputgroup.appendChild(outputfieldicondelete);
                halfrow.appendChild(label);
                halfrow.appendChild(outputgroup);
                row.appendChild(halfrow);
            };
            walletList.appendChild(row);
            count = count - 2;
        };

        if (appendlater) {
            appendlater.parentNode.insertBefore(document.querySelector(".each-row-half"), appendlater);
            document.querySelector(".each-row-half").parentNode.prepend(appendlater);
        };
    }).catch(async (err) => { await handleTimeOut(err); });
};
const handleKeyringExistance = async (page_to_load, setup_func) => {
    if (JSON.parse(sessionStorage.getItem("keyring")).required) {
        if (JSON.parse(sessionStorage.getItem("keyring")).exists) {
            await changePage("page-content/keyring-auth.html", () => keyringAuthSetup(page_to_load, setup_func));
        } else {
            await changePage("page-content/create-keyring.html", () => createKeyringSetup(page_to_load, setup_func));
        };
    } else {
        await changePage(page_to_load, setup_func);
    };
};
const showErrorMessage = (message) => {
    const warningEl = document.getElementById("inner-warning");
    const warningElText = document.getElementById("inner-warning-text");
    warningEl.setAttribute("style", "display: flex;");
    warningEl.classList.add("warning-animation");
    setTimeout(() => {
        warningEl.classList.remove("warning-animation");
    }, 500);
    warningElText.textContent = message;
};
const hideErrorMessage = () => {
    document.getElementById("inner-warning").setAttribute("style", "display: none;");
};
const getLatestTag = async () => {
    const client = await http.getClient();
    const repoUrl = projects.find(item => item.project.name == currentIp.icon).project.social_media_accounts.github;
    latest_tag = (await client.get(`https://api.github.com/repos${repoUrl.split("github.com")[1]}/releases/latest`, {
        type: 'Json'
    })).data.tag_name;
};
const deleteNode = async () => {
    showLoadingAnimation();
    await tauri.invoke("start_stop_restart_node", { action: "stop" }).catch(async (err) => { await handleTimeOut(err); });
    await tauri.invoke("cpu_mem_sync_stop").catch((err) => { console.log(err); });
    await tauri.invoke("delete_node", { exception: exception }).then(async () => {
        currentIp.icon = "Empty Server";
        currentIp.validator_addr = "";
        localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
        loadHomePage();
    }).catch((err) => {
        console.log(err);
    });
};
const handleTimeOut = async (err) => {
    if (err == "There is no active session. Timed out.") {
        dialog.message("There is no active session. Timed out.");
        await loadLoginPage();
        return function () { return; };
    };
};

const nodeOperationsSetup = async () => {
    startNodeButton = document.querySelectorAll(".each-page-manage-node-button")[0];
    stopNodeButton = document.querySelectorAll(".each-page-manage-node-button")[1];
    restartNodeButton = document.querySelectorAll(".each-page-manage-node-button")[2];
    updateNodeButton = document.querySelectorAll(".each-page-manage-node-button")[3];
    deleteNodeButton = document.getElementById("delete-node-button");

    updateNodeButton.disabled = true;
    startNodeButton.addEventListener("click", async () => {
        node_action = "start";
        document.body.classList.add("waiting");
        await tauri.invoke("start_stop_restart_node", { action: "start" }).catch(async (err) => { await handleTimeOut(err); });
    });
    stopNodeButton.addEventListener("click", async () => {
        node_action = "stop";
        document.body.classList.add("waiting");
        await tauri.invoke("start_stop_restart_node", { action: "stop" }).catch(async (err) => { await handleTimeOut(err); });
    });
    restartNodeButton.addEventListener("click", async () => {
        node_action = "restart";
        document.body.classList.add("waiting");
        await tauri.invoke("start_stop_restart_node", { action: "restart" }).catch(async (err) => { await handleTimeOut(err); });
    });
    updateNodeButton.addEventListener("click", async () => {
        node_action = "update";
        document.body.classList.add("waiting");
        await tauri.invoke("update_node", { latestVersion: latest_tag }).catch(async (err) => { await handleTimeOut(err); });
    });
    deleteNodeButton.addEventListener("click", async () => {
        if (await dialog.ask("This action cannot be reverted. Are you sure?", { title: "Delete Node", type: "warning" })) {
            await deleteNode();
        };
    });
    await getLatestTag();
    hideLoadingAnimation();
    window.scrollTo(0, 0);
};
const validatorListSetup = async () => {
    showLoadingAnimation();
    await tauri.invoke("validator_list").then((res) => {
        res = res ? JSON.parse(res) : [];
        const contentOfPage = document.getElementById("content-of-page");
        for (let i = 0; i < res.length; i++) {
            valdiv = document.createElement("div");
            valdiv.setAttribute("class", "each-row");

            valname = document.createElement("div");
            valname.setAttribute("class", "each-row-half");
            valname.setAttribute("style", "width: 35%; margin-right: 3%;");
            valname.textContent = res[i].validator;

            valvotingpower = document.createElement("div");
            valvotingpower.setAttribute("class", "each-row-half");
            valvotingpower.setAttribute("style", "width: 25%; margin-right: 3%;");
            valvotingpower.textContent = res[i].voting_power;

            valcommission = document.createElement("div");
            valcommission.setAttribute("class", "each-row-half");
            valcommission.setAttribute("style", "width: 15%; margin-right: 3%;");
            valcommission.textContent = res[i].commission + "%";

            valstaking = document.createElement("div");
            valstaking.setAttribute("class", "each-row-half");
            valstaking.setAttribute("style", "width: 15%;");

            valstakebutton = document.createElement("div");
            valstakebutton.setAttribute("class", "each-button");
            valstakebutton.setAttribute("style", "margin-left: auto;");
            valstakebutton.textContent = "Stake";
            valstakebutton.addEventListener("click", async () => {
                await handleKeyringExistance("page-content/delegate-token.html", () => delegateSetup(res[i].valoper));
            });
            valstaking.appendChild(valstakebutton);

            valdivider = document.createElement("div");
            valdivider.setAttribute("class", "each-row-divider");

            valdiv.appendChild(valname);
            valdiv.appendChild(valvotingpower);
            valdiv.appendChild(valcommission);
            valdiv.appendChild(valstaking);
            valdiv.appendChild(valdivider);
            contentOfPage.appendChild(valdiv);
        }
    }).catch(async (err) => { await handleTimeOut(err); });
    hideLoadingAnimation();
    window.scrollTo(0, 400);
};
const createValidatorSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        if (syncStatusChartPopupText.innerText.includes("Node is synced!")) {
            showLoadingAnimation();
            hideErrorMessage();
            await tauri.invoke("create_validator", {
                amount: document.querySelectorAll(".each-input-field")[0].value,
                walletName: document.querySelectorAll(".each-input-field")[1].value,
                monikerName: document.querySelectorAll(".each-input-field")[2].value,
                fees: document.querySelectorAll(".each-input-field")[3].value,
                website: document.querySelectorAll(".each-input-field")[4].value,
                keybaseId: document.querySelectorAll(".each-input-field")[5].value,
                contact: document.querySelectorAll(".each-input-field")[6].value,
                comRate: document.querySelectorAll(".each-input-field")[7].value,
                details: document.querySelectorAll(".each-input-field")[8].value,
                exception: exception
            }).then(async (res) => {
                res = JSON.parse(res);
                console.log(res);
                if (res.raw_log.length == 2) {
                    dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
                    await tauri.invoke("show_wallets", { exception: exception }).then(async (list) => {
                        list = JSON.parse(list);
                        currentIp.validator_addr = list.filter((item) => item.name == document.querySelectorAll(".each-input-field")[1].value)[0].address;
                    }).catch((err) => {
                        console.log(err);
                        showErrorMessage(err);
                    });
                    await tauri.invoke("set_main_wallet", { walletname: document.querySelectorAll(".each-input-field")[1].value, address: currentIp.validator_addr, exception: exception }).catch((err) => {
                        console.log(err);
                        showErrorMessage(err);
                    });
                    localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                    await updateSidebar();
                } else {
                    showErrorMessage(res.raw_log);
                };
            }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
            hideLoadingAnimation();
        } else {
            showErrorMessage("Please wait for the node to sync!");
        };
    });
    window.scrollTo(0, 400);
};
const editValidatorSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        if (syncStatusChartPopupText.innerText.includes("Node is synced!")) {
            showLoadingAnimation();
            hideErrorMessage();
            await tauri.invoke("edit_validator", {
                amount: document.querySelectorAll(".each-input-field")[0].value,
                walletName: document.querySelectorAll(".each-input-field")[1].value,
                website: document.querySelectorAll(".each-input-field")[2].value,
                comRate: document.querySelectorAll(".each-input-field")[3].value,
                contact: document.querySelectorAll(".each-input-field")[4].value,
                keybaseId: document.querySelectorAll(".each-input-field")[5].value,
                details: document.querySelectorAll(".each-input-field")[6].value,
            }).then((res) => {
                res = JSON.parse(res);
                if (res.raw_log.length == 2) {
                    dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
                } else {
                    showErrorMessage(res.raw_log);
                };
            }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
            hideLoadingAnimation();
        } else {
            showErrorMessage("Please wait for the node to sync!");
        };
    });
    window.scrollTo(0, 400);
};
const withdrawRewardsSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        hideErrorMessage();
        await tauri.invoke("withdraw_rewards", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            fees: document.querySelectorAll(".each-input-field")[1].value,
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            };
        }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const delegateSetup = (valoper) => {
    document.querySelectorAll(".each-input-field")[1].value = valoper;
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        hideErrorMessage();
        await tauri.invoke("delegate_token", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            validatorValoper: document.querySelectorAll(".each-input-field")[1].value,
            amount: document.querySelectorAll(".each-input-field")[2].value,
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            };
        }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const redelegateSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        hideErrorMessage();
        await tauri.invoke("redelegate_token", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            destinationValidator: document.querySelectorAll(".each-input-field")[1].value,
            firstValidator: document.querySelectorAll(".each-input-field")[2].value,
            fees: document.querySelectorAll(".each-input-field")[3].value,
            amount: document.querySelectorAll(".each-input-field")[4].value,
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            };
        }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const voteSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        hideErrorMessage();
        await tauri.invoke("vote", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            proposalNumber: document.querySelectorAll(".each-input-field")[1].value,
            selectedOption: document.querySelector(".each-input-radio-option:checked").nextElementSibling.textContent.toLowerCase(),
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            };
        }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const unjailSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        hideErrorMessage();
        await tauri.invoke("unjail", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            fees: document.querySelectorAll(".each-input-field")[1].value,
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            };
        }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const sendTokenSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        hideErrorMessage();
        await tauri.invoke("send_token", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            receiverAddress: document.querySelectorAll(".each-input-field")[1].value,
            amount: document.querySelectorAll(".each-input-field")[2].value,
            fees: document.querySelectorAll(".each-input-field")[3].value
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            };
        }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const createKeyringSetup = (page_html, page_setup) => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        if (document.querySelectorAll(".each-input-field")[0].value.length < 8) {
            showErrorMessage("Passphrase must be at least 8 characters long!");
        }
        else if (document.querySelectorAll(".each-input-field")[0].value !== document.querySelectorAll(".each-input-field")[1].value) {
            showErrorMessage("Passphrases do not match!");
        }
        else {
            showLoadingAnimation();
            await tauri.invoke("create_keyring", { passphrase: document.querySelector(".each-input-field").value }).then(async () => {
                sessionStorage.setItem("keyring", '{"required": true, "exists": true}');
                await changePage("page-content/keyring-auth.html", () => keyringAuthSetup(page_html, page_setup));
            }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
            hideLoadingAnimation();
        };
    });
    document.querySelectorAll(".each-input-field")[1].addEventListener("keydown", (e) => {
        if (e.key == "Enter") {
            document.querySelector(".each-button").click();
        };
    });
    window.scrollTo(0, 400);
};
const keyringAuthSetup = (page_html, page_setup) => {
    document.querySelector(".each-input-helper-text").addEventListener("click", async () => {
        if (await dialog.ask("This action will delete all the wallets. Are you sure you want to continue?", { title: "Reset Keyring", type: "warning" })) {
            showLoadingAnimation();
            await tauri.invoke("delete_keyring").then(async () => {
                sessionStorage.setItem("keyring", '{"required": true, "exists": false}');
                await changePage("page-content/create-keyring.html", () => createKeyringSetup(page_html, page_setup));
            }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
            hideLoadingAnimation();
        };
    });
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        await tauri.invoke("check_keyring_passphrase", { passw: document.querySelectorAll(".each-input-field")[0].value, exception: exception }).then(async () => {
            await changePage(page_html, page_setup);
        }).catch(async (err) => { await handleTimeOut(err); showErrorMessage(err); });
        hideLoadingAnimation();
    });
    document.querySelector(".each-input-field").addEventListener("keydown", (e) => {
        if (e.key == "Enter") {
            document.querySelector(".each-button").click();
        };
    });
    window.scrollTo(0, 400);
};
const walletsSetup = async () => {
    showLoadingAnimation();
    await showWallets();
    document.querySelector(".each-mnemonic-input-field").addEventListener("paste", function () {
        setTimeout(() => {
            if (this.value.split(" ").length == 24) {
                mnemo = this.value.split(" ");
                document.querySelectorAll(".each-mnemonic-input-field").forEach((element, index) => {
                    element.value = mnemo[index];
                });
            };
        }, 100);
    });
    document.querySelectorAll(".each-button")[0].addEventListener("click", async function () {
        await createWallet(document.querySelectorAll(".each-input-field")[0].value);
    });
    document.querySelectorAll(".each-input-field")[0].addEventListener("keydown", (e) => {
        if (e.key == "Enter") {
            document.querySelectorAll(".each-button")[0].click();
        };
    });
    document.querySelectorAll(".each-button")[1].addEventListener("click", async function () {
        await recoverWallet(document.querySelectorAll(".each-input-field")[1].value);
    });
    for (let i = 1; i < 24; i++) {
        document.querySelectorAll(".each-mnemonic-input-field")[i].addEventListener("keydown", (e) => {
            if (e.key == "Backspace" && document.querySelectorAll(".each-mnemonic-input-field")[i].value.length == 0) {
                document.querySelectorAll(".each-mnemonic-input-field")[i - 1].focus();
            };
        });
    };
    hideLoadingAnimation();
    window.scrollTo(0, 400);
};
const logsSetup = async () => {
    tauri.invoke("check_logs");
};
const nodeInformationSetup = async () => {
    showLoadingAnimation();
    await tauri.invoke("node_info").then(async (obj) => {
        const fields = document.querySelectorAll(".each-output-field");
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
        fields[20].textContent = obj.ValidatorInfo.Address;
        fields[21].textContent = obj.ValidatorInfo.PubKey.type;
        fields[22].textContent = obj.ValidatorInfo.PubKey.value;
        fields[23].textContent = obj.ValidatorInfo.VotingPower;
    }).catch(async (err) => { await handleTimeOut(err); });
    document.querySelectorAll(".each-output-field-icon-copy").forEach((element) => {
        element.addEventListener("click", () => {
            clipboard.writeText(element.previousElementSibling.textContent);
            saveforlater = element.previousElementSibling.textContent;
            element.previousElementSibling.textContent = "Copied!";
            setTimeout(() => {
                element.previousElementSibling.textContent = saveforlater;
            }, 1000);
        });
    });
    hideLoadingAnimation();
    window.scrollTo(0, 400);
};

const setupNodePage = () => {
    const validatorAddress = document.querySelector(".sidebar-info-details-copy");
    const validatorAddressText = document.querySelector(".sidebar-info-details-copy-address");
    const validatorOperationsButton = document.getElementById("validator-operations-button");
    const validatorOperationsArrow = document.querySelector(".each-dropdown-button-arrow");
    const nodeInformationButton = document.getElementById("node-information-button");
    const subButtonsDiv = document.querySelector(".sidebar-dropdown-subbuttons");
    const homePageButton = document.getElementById("home-page-button");
    const nodeOperationsButton = document.getElementById("node-operations-button");
    const validatorListButton = document.getElementById("validator-list-button");
    const createValidatorButton = document.getElementById("create-validator-button");
    const editValidatorButton = document.getElementById("edit-validator-button");
    const withdrawRewardsButton = document.getElementById("withdraw-rewards-button");
    const unjailButton = document.getElementById("unjail-button");
    const delegateTokenButton = document.getElementById("delegate-token-button");
    const sendTokenButton = document.getElementById("send-token-button");
    const redelegateTokenButton = document.getElementById("redelegate-token-button");
    const voteButton = document.getElementById("vote-button");
    const walletsButton = document.getElementById("wallets-button");
    const logsButton = document.getElementById("logs-button");

    node_action = "";

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
        saveforlater = validatorAddressText.innerText;
        validatorAddressText.innerText = "Copied!";
        setTimeout(() => {
            validatorAddressText.innerText = saveforlater;
        }, 1000);
    });

    nodeOperationsButton.addEventListener("click", async function () {
        await changePage("page-content/node-operations.html", nodeOperationsSetup);
    });
    homePageButton.addEventListener("click", async function () {
        showLoadingAnimation();
        await tauri.invoke("cpu_mem_sync_stop").catch(async (e) => { await handleTimeOut(e); });
        await loadHomePage();
    });
    validatorOperationsButton.addEventListener("click", function () {
        if (window.getComputedStyle(subButtonsDiv).getPropertyValue("display") == "none") {
            subButtonsDiv.style.display = "block";
            validatorOperationsArrow.style.transform = "rotate(-180deg)";
            validatorOperationsArrow.style.transition = "0.5s";
        }
        else {
            validatorOperationsArrow.style.transform = "rotate(0)";
            validatorOperationsArrow.style.transition = "0.5s";
            subButtonsDiv.style.display = "none";
        };
    });
    validatorListButton.addEventListener("click", async function () {
        await changePage("page-content/validator-list.html", validatorListSetup);
    });
    createValidatorButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/create-validator.html", createValidatorSetup);
    });
    editValidatorButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/edit-validator.html", editValidatorSetup);
    });
    withdrawRewardsButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/withdraw-rewards.html", withdrawRewardsSetup);
    });
    delegateTokenButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/delegate-token.html", () => delegateSetup(""));
    });
    redelegateTokenButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/redelegate-token.html", redelegateSetup);
    });
    voteButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/vote.html", voteSetup);
    });
    unjailButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/unjail.html", unjailSetup);
    });
    sendTokenButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/send-token.html", sendTokenSetup);
    });
    walletsButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/wallets.html", walletsSetup);
    });
    logsButton.addEventListener("click", async function () {
        await changePage("page-content/logs.html", logsSetup);
    });
    nodeInformationButton.addEventListener("click", async function () {
        await changePage("page-content/node-information.html", nodeInformationSetup);
    });
};