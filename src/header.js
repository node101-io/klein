const updateHeader = function () {
    if (currentIp.icon == "Empty Server") {
        imgSrc = "assets/default.png";
    } else {
        imgSrc = projects.find(item => item.name == currentIp.icon).image;
    }
    document.querySelector(".header-node-icon").setAttribute("src", imgSrc);
    document.querySelector(".header-menu-ip-list-button-icon").setAttribute("src", imgSrc);
    document.querySelector(".header-menu-ip-list-button-details-ip").textContent = currentIp.ip;
    document.querySelector(".header-menu-ip-list-button-details-name").textContent = currentIp.icon;
}

const setupHeader = function () {
    const headerMenu = document.querySelector(".header-menu");
    const submenuIpList = document.querySelector(".header-submenu-ip-list");
    const submenuNotifications = document.querySelector(".header-submenu-notifications");
    const scrollbarBackground = document.querySelector(".header-menu-scroll-background");
    const headerMenuIpButton = document.querySelector(".header-menu-ip-list-button");
    const nodeIcons = document.querySelector(".header-node-icons");
    const notificationsButton = document.getElementById("notifications-button");
    const logoutButton = document.getElementById("logout-button");

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
                    currentIp = ipAddresses.find(item => item.ip === ip);
                    currentIp.icon = res[1] ? projects.find(item => item.wizard_key === found).name : "";
                    ipAddresses.find(item => item.ip === ip).icon = currentIp.icon;
                    localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                    tauri.invoke("cpu_mem_sync_stop");
                    promptDiv.remove();
                    setTimeout(() => {
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
            ipAddresses[i].icon == "Empty Server" ? ipListItemIcon.setAttribute("style", "display: none;") : ipListItem.appendChild(ipListItemIcon);
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

    window.addEventListener("click", async (e) => {
        if (headerMenu.style.display == "block" && !e.target.closest(".header-menu") && !e.target.closest(".header-node-icon")) {
            headerMenu.setAttribute("style", "display: none;");
            submenuIpList.setAttribute("style", "display: none;");
            submenuNotifications.setAttribute("style", "display: none;");
            scrollbarBackground.setAttribute("style", "display: none;");
        }
    });
};