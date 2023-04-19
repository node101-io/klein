const updateHeader = function () {
    imgSrc = (currentIp.icon == "Empty Server") ? "assets/default.png" : projects.find(item => item.project.name == currentIp.icon).project.image;
    document.querySelector(".header-node-icon").src = imgSrc;
    document.querySelector(".header-menu-ip-list-button-icon").src = imgSrc;
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
    const switchIpPromptClose = document.querySelector(".switch-ip-prompt-close");
    const switchIpPromptButton = document.querySelector(".switch-ip-prompt-button");
    const switchIpPromptInput = document.querySelector(".switch-ip-prompt-input");

    nodeIcons.addEventListener('click', function () {
        if (headerMenu.style.display == "block") {
            headerMenu.style.display = "none";
            submenuIpList.style.display = "none";
            submenuNotifications.style.display = "none";
            scrollbarBackground.style.display = "none";
        }
        else {
            headerMenu.style.display = "block";
        }
    });

    headerMenuIpButton.addEventListener('click', function () {
        submenuNotifications.style.display = "none";
        submenuIpList.innerHTML = "";
        for (let i = 0; i < ipAddresses.length; i++) {
            ipListItem = document.createElement("div");
            ipListItem.classList.add("each-header-submenu-ip-list-item");
            ipListItemIcon = document.createElement("img");
            ipListItemIcon.src = projects.find(item => item.project.name == ipAddresses[i].icon) ? projects.find(item => item.project.name == ipAddresses[i].icon).project.image : "";
            ipListItemIcon.classList.add("each-header-submenu-ip-list-item-icon");
            ipListItemName = document.createElement("div");
            ipListItemName.classList.add("each-header-submenu-ip-list-item-name");
            ipListItemName.innerText = ipAddresses[i].icon == "" ? "Empty Server" : ipAddresses[i].icon;
            ipListItemIp = document.createElement("div");
            ipListItemIp.classList.add("each-header-submenu-ip-list-item-ip");
            ipListItemIp.innerText = ipAddresses[i].ip;
            ipAddresses[i].icon == "Empty Server" ? ipListItemIcon.style.display = "none" : ipListItem.appendChild(ipListItemIcon);
            ipListItem.appendChild(ipListItemName);
            ipListItem.appendChild(ipListItemIp);
            ipListItem.addEventListener("click", () => {
                if (currentIp.ip == ipAddresses[i].ip) {
                    document.querySelector(".all-page-wrapper").click();
                } else {
                    document.querySelector(".all-header-wrapper").click();
                    document.querySelector(".switch-ip-prompt .each-input-label").textContent = ipAddresses[i].ip;
                    document.querySelector(".switch-ip-prompt").style.display = "flex";
                    switchIpPromptInput.focus();
                }
            });
            submenuIpList.appendChild(ipListItem);
        }
        if (submenuIpList.style.display == "block") {
            submenuIpList.style.display = "none";
            scrollbarBackground.style.display = "none";
        }
        else {
            submenuIpList.style.display = "block";
            scrollbarBackground.style.display = "block";
            scrollbarBackground.style.height = `${Math.min(ipAddresses.length, 3) * 60}px`;
        }
    });

    notificationsButton.addEventListener('click', function () {
        submenuIpList.style.display = "none";
        submenuNotifications.innerHTML = "";
        const notifications = localStorage.getItem("notifications") ? JSON.parse(localStorage.getItem("notifications")) : [];
        for (let i = notifications.length - 1; 0 < i; i--) {
            notificationItem = document.createElement("div");
            notificationItem.classList.add("each-header-submenu-notifications-item");
            notificationIcon = document.createElement("span");
            notificationIcon.classList.add(`each-notification-icon${notifications[i].unread ? '' : '-seen'}`);
            notificationContent = document.createElement("div");
            notificationContent.classList.add("each-notification-content");
            notificationContent.innerText = notifications[i].text;
            notificationItem.appendChild(notificationIcon);
            notificationItem.appendChild(notificationContent);
            submenuNotifications.appendChild(notificationItem);
        }
        document.querySelector(".header-node-icon-notification").style.display = "none";
        document.querySelector(".each-header-menu-item-notification").style.display = "none";
        localStorage.setItem("notifications", JSON.stringify(notifications.map((notification) => {
            notification.unread = false;
            return notification;
        })));
        if (submenuNotifications.style.display == "block") {
            submenuNotifications.style.display = "none";
            scrollbarBackground.style.display = "none";
        }
        else {
            submenuNotifications.style.display = "block";
            scrollbarBackground.style.display = "block";
            scrollbarBackground.style.height = `${Math.min(notifications.length, 6) * 36}px`;
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

    switchIpPromptClose.addEventListener('click', function () {
        document.querySelector(".switch-ip-prompt").style.display = "none";
        switchIpPromptInput.value = "";
    });

    switchIpPromptButton.addEventListener('click', async function () {
        const ip = document.querySelector(".switch-ip-prompt .each-input-label").textContent;
        const passw = switchIpPromptInput.value;
        if (passw == "") {
            switchIpPromptInput.focus();
        } else {
            showLoadingAnimation();
            await tauri.invoke("log_in_again", { ip: ip, password: passw }).then(async () => {
                await tauri.invoke("cpu_mem_sync_stop");
                tauri.invoke("log_in", {
                    ip: ip,
                    password: passw,
                }).then((res) => {
                    console.log("res", res);
                    currentIp = ipAddresses.find(item => item.ip == ip);
                    const project_name = res ? projects.find(item => item.project.wizard_key === res).project.name : "Empty Server";
                    if (currentIp.icon !== project_name) {
                        currentIp.icon = project_name;
                        currentIp.validator_addr = "";
                    }
                    localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                    switchIpPromptInput.value = "";
                    switchIpPromptClose.click();
                    res ? loadNodePage(true) : loadHomePage();
                    hideLoadingAnimation();
                }).catch((err) => {
                    console.log(err);
                    hideLoadingAnimation();
                });
            }).catch((err) => {
                console.log(err);
                switchIpPromptInput.value = "";
                dialog.message(err, { type: "error" });
                hideLoadingAnimation();
            });
        }
    });

    switchIpPromptInput.addEventListener('keydown', function (e) {
        if (e.key == "Enter") {
            switchIpPromptButton.click();
        }
    });

    window.addEventListener("click", async (e) => {
        if (headerMenu.style.display == "block" && !e.target.closest(".header-menu") && !e.target.closest(".header-node-icons")) {
            headerMenu.style.display = "none";
            submenuIpList.style.display = "none";
            submenuNotifications.style.display = "none";
            scrollbarBackground.style.display = "none";
        }
    });
};