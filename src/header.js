const headerMenu = document.querySelector(".header-menu");
const submenuIpList = document.querySelector(".header-submenu-ip-list");
const submenuNotifications = document.querySelector(".header-submenu-notifications");
const scrollbarBackground = document.querySelector(".header-menu-scroll-background");
const nodeIcon = document.querySelector(".header-node-icon");
const nodeIcons = document.querySelector(".header-node-icons");
const headerMenuIpButton = document.querySelector(".header-menu-ip-list-button");
const headerMenuIpButtonName = document.querySelector(".header-menu-ip-list-button-details-name");
const headerMenuIpButtonIp = document.querySelector(".header-menu-ip-list-button-details-ip");
const headerMenuIpButtonIcon = document.querySelector(".header-menu-ip-list-button-icon");
const notificationsButton = document.getElementById("notifications-button");
const logoutButton = document.getElementById("logout-button");

const createHeaderMenu = function () {
    for (let i = 0; i < ipAddresses.length; i++) {
        ipListItem = document.createElement("div");
        ipListItem.setAttribute("class", "each-header-submenu-ip-list-item");
        ipListItemIcon = document.createElement("img");
        ipListItemIcon.setAttribute("src", `../assets/projects/${ipAddresses[i].icon.toLowerCase().replace(" ", "-")}.png`);
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
            console.log(ipAddresses[i].ip);
        });
        submenuIpList.appendChild(ipListItem);
    }
    nodeIcon.setAttribute("src", imgSrc);
    if (imgSrc == `../assets/projects/default.png`) {
        headerMenuIpButtonIcon.setAttribute("style", "display: none;");
    } else {
        headerMenuIpButtonIcon.setAttribute("src", imgSrc);
    }
    headerMenuIpButtonName.textContent = project;
    headerMenuIpButtonIp.textContent = localStorage.getItem("ip");

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
            window.location.href = "../login.html";
        }, 1000);
    });
}

const hideMenuWhenClickedOutside = function (e) {
    if (headerMenu.style.display == "block" && !e.target.closest(".header-menu") && !e.target.closest(".header-node-icon")) {
        headerMenu.setAttribute("style", "display: none;");
        submenuIpList.setAttribute("style", "display: none;");
        submenuNotifications.setAttribute("style", "display: none;");
        scrollbarBackground.setAttribute("style", "display: none;");
    }
}