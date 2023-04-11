const headerMenu = document.querySelector(".header-menu");
const submenuIpList = document.querySelector(".header-submenu-ip-list");
const submenuNotifications = document.querySelector(".header-submenu-notifications");
const scrollbarBackground = document.querySelector(".header-menu-scroll-background");
const nodeIcon = document.querySelector(".header-node-icon");
const headerMenuIpButton = document.querySelector(".header-menu-ip-list-button");
const headerMenuIpButtonName = document.querySelector(".header-menu-ip-list-button-details-name");
const headerMenuIpButtonIp = document.querySelector(".header-menu-ip-list-button-details-ip");
const headerMenuIpButtonIcon = document.querySelector(".header-menu-ip-list-button-icon");
const notificationsButton = document.getElementById("notifications-button");
const logoutButton = document.getElementById("logout-button");

const updateHeader = function () {
    headerMenuIpButtonIp.textContent = currentIp.ip;
    headerMenuIpButtonName.textContent = currentIp.icon;
    const imgSrc = currentIp.icon ? projects.find(item => item.name == currentIp.icon).image : "assets/default.png";
    nodeIcon.setAttribute("src", imgSrc);
    headerMenuIpButtonIcon.setAttribute("src", imgSrc);
}

const createPasswordPrompt = function (ip) {
    headerMenu.setAttribute("style", "display: none;");
    submenuIpList.setAttribute("style", "display: none;");
    submenuNotifications.setAttribute("style", "display: none;");
    scrollbarBackground.setAttribute("style", "display: none;");

    promptDiv = document.createElement("div");
    closeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    closeSvg.setAttribute("class", "switch-ip-prompt-close");
    closeSvg.setAttribute("viewBox", "0 0 24 24");
    closeSvg.setAttribute("stroke", "var(--divider-color)");
    closeSvg.setAttribute("stroke-width", "2");
    closePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    closePath.setAttribute("d", "M6 18L18 6M6 6l12 12");
    closeSvg.addEventListener("click", () => {
        promptDiv.remove();
    });
    closeSvg.appendChild(closePath);
    promptDiv.appendChild(closeSvg);
    promptInDiv = document.createElement("div");
    promptDiv.setAttribute("class", "switch-ip-prompt");
    promptTitle = document.createElement("div");
    promptTitle.setAttribute("class", "each-input-label");
    promptTitle.innerText = ip;
    promptInput = document.createElement("input");
    promptInput.setAttribute("class", "each-input-field");
    promptInput.setAttribute("placeholder", "Password");
    promptInput.setAttribute("type", "password");
    promptLoginButton = document.createElement("div");
    promptLoginButton.setAttribute("class", "each-button");
    promptLoginButton.setAttribute("style", "margin-top: 16px; margin-left: auto;");
    promptLoginButton.addEventListener("click", async () => {
        showLoadingAnimation();
        if (await tauri.invoke("log_in_again", { ip: ip, password: promptInput.value })) {
            tauri.invoke("log_in", {
                ip: ip,
                password: promptInput.value
            }).then((res) => {
                const found = projects.reduce((acc, project) => {
                    if (project.wizard_key !== null) {
                        acc.push(project.wizard_key);
                    }
                    return acc;
                }, []).find(item => item === res[1]);
                currentIp.ip = ip;
                currentIp.icon = res[1] ? projects.find(item => item.wizard_key === found).name : "";
                ipAddresses.find(item => item.ip === ip).icon = currentIp.icon;
                localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                setTimeout(() => {
                    tauri.invoke("cpu_mem_sync_stop");
                    if (found) {
                        loadNodePage();
                    } else {
                        loadHomePage();
                    }
                }, 1000);
            });
        } else {
            dialog.message("Incorrect password", "Please try again", "error");
            hideLoadingAnimation();
        }
    });
    promptLoginButton.innerText = "Login";
    promptInDiv.appendChild(promptTitle);
    promptInDiv.appendChild(promptInput);
    promptInDiv.appendChild(promptLoginButton);
    promptDiv.appendChild(promptInDiv);
    document.querySelector(".all-wrapper").appendChild(promptDiv);
    promptInput.focus();
};

const hideMenuWhenClickedOutside = function (e) {
    if (headerMenu.style.display == "block" && !e.target.closest(".header-menu") && !e.target.closest(".header-node-icon")) {
        headerMenu.setAttribute("style", "display: none;");
        submenuIpList.setAttribute("style", "display: none;");
        submenuNotifications.setAttribute("style", "display: none;");
        scrollbarBackground.setAttribute("style", "display: none;");
    }
}