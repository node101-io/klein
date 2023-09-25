const updateHeader = () => {
    if (!ONBOARD_USER) {
        document.querySelector(".header-node-icons").style.display = "flex";
        if (currentIp.icon == "Empty Server") {
            imgSrc = "assets/default.png";
            document.querySelector(".header-menu-ip-list-button-icon").style.display = "none";
        } else {
            imgSrc = all_projects.find(item => item.project.name == currentIp.icon).project.image + "?" + new Date().getTime();
            document.querySelector(".header-menu-ip-list-button-icon").style.display = "unset";
            document.querySelector(".header-menu-ip-list-button-icon").src = imgSrc;
        };
        document.querySelector(".header-node-icon").src = imgSrc;
        document.querySelector(".header-menu-ip-list-button-details-ip").textContent = currentIp.ip;
        document.querySelector(".header-menu-ip-list-button-details-name").textContent = currentIp.icon;
    } else {
        document.querySelector(".header-node-icons").style.display = "none";
    };
};

const setupHeader = () => {
    const headerMenu = document.querySelector(".header-menu");
    const homePageButton = document.getElementById("home-page-button");
    const submenuIpList = document.querySelector(".header-submenu-ip-list");
    const submenuNotifications = document.querySelector(".header-submenu-notifications");
    const scrollbarBackground = document.querySelector(".header-menu-scroll-background");
    const headerMenuIpButton = document.querySelector(".header-menu-ip-list-button");
    const headerMenuIpButtonArrow = document.querySelector(".header-menu-ip-list-button-arrow");
    const nodeIcons = document.querySelector(".header-node-icons");
    const notificationsButton = document.getElementById("notifications-button");
    const logoutButton = document.getElementById("logout-button");
    const switchIpPrompt = document.querySelector(".switch-ip-prompt");
    const switchIpPromptBackground = document.querySelector(".switch-ip-prompt-background");
    const switchIpPromptClose = document.querySelector(".switch-ip-prompt-close");
    const switchIpPromptButton = document.querySelector(".switch-ip-prompt-button");
    const switchIpPromptInput = document.querySelector(".switch-ip-prompt-input");

    homePageButton.addEventListener("click", async function () {
        if (prevent_close && !(await dialog.ask("Installatin is in progress. Are you sure you want to proceed?"))) return;
        showLoadingAnimation();
        await tauri.invoke("cpu_mem_sync_stop").catch(async (e) => { await handleTimeOut(e); });
        await loadHomePage();
    });

    nodeIcons.addEventListener('click', function () {
        if (headerMenu.style.display == "block") {
            headerMenu.style.display = "none";
            submenuIpList.style.display = "none";
            submenuNotifications.style.display = "none";
            scrollbarBackground.style.display = "none";
        }
        else {
            headerMenuIpButtonArrow.style.display = (ipAddresses.length == 0 || (ipAddresses.length == 1 && ipAddresses[0].ip == currentIp.ip)) ? "none" : "unset";
            headerMenu.style.display = "block";
        };
    });

    headerMenuIpButton.addEventListener('click', function () {
        submenuNotifications.style.display = "none";
        submenuIpList.innerHTML = "";
        for (let i = 0; i < ipAddresses.length; i++) {
            ipListItem = document.createElement("div");
            ipListItem.classList.add("each-header-submenu-ip-list-item");
            ipListItemIcon = document.createElement("img");
            ipListItemIcon.src = all_projects.find(item => item.project.name == ipAddresses[i].icon) ? all_projects.find(item => item.project.name == ipAddresses[i].icon).project.image : "";
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
                    switchIpPromptBackground.style.display = "flex";
                    switchIpPrompt.style.display = "flex";
                    switchIpPromptInput.focus();
                };
            });
            submenuIpList.appendChild(ipListItem);
        };
        if (submenuIpList.style.display == "block") {
            submenuIpList.style.display = "none";
            scrollbarBackground.style.display = "none";
        }
        else {
            if (headerMenuIpButtonArrow.style.display == "unset") {
                submenuIpList.style.display = "block";
                scrollbarBackground.style.display = "block";
                scrollbarBackground.style.height = `${Math.min(ipAddresses.length, 3) * 60}px`;
            }
        };
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
        };
    });

    logoutButton.addEventListener('click', async function () {
        proceed = prevent_close ? await dialog.confirm("Installation will be cancelled. Are you sure you want to exit?") : true;
        prevent_close = false;
        if (proceed) {
            showLoadingAnimation();
            await tauri.invoke("cpu_mem_sync_stop").catch(async (err) => { await handleTimeOut(err); });
            await tauri.invoke("log_out").catch((err) => console.log(err));
            loadLoginPage();
        };
    });

    switchIpPromptBackground.addEventListener('click', function () {
        switchIpPromptClose.click();
    });

    switchIpPromptClose.addEventListener('click', function () {
        switchIpPrompt.style.display = "none";
        switchIpPromptBackground.style.display = "none";
        hideLogInError(true);
        switchIpPromptInput.value = "";
    });

    switchIpPromptButton.addEventListener('click', async function () {
        await logIn(document.querySelector(".switch-ip-prompt .each-input-label"), switchIpPromptInput, true);
    });

    switchIpPromptInput.addEventListener('keydown', function (e) {
        if (e.key == "Enter") {
            switchIpPromptButton.click();
        };
    });

    window.addEventListener("click", async (e) => {
        if (headerMenu.style.display == "block" && !e.target.closest(".header-menu") && !e.target.closest(".header-node-icons")) {
            headerMenu.style.display = "none";
            submenuIpList.style.display = "none";
            submenuNotifications.style.display = "none";
            scrollbarBackground.style.display = "none";
        };
    });
};