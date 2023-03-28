const { invoke } = window.__TAURI__.tauri;
const { fetch, getClient, Body } = window.__TAURI__.http;

let ipAddresses = localStorage.getItem("ipaddresses") ? JSON.parse(localStorage.getItem("ipaddresses")) : [];
let notifications = localStorage.getItem("notifications") ? JSON.parse(localStorage.getItem("notifications")) : [];

document.querySelector(".header-node-icon").src = `../assets/projects/${localStorage.getItem("project").toLowerCase().replace(" ", "-")}.png`;
document.querySelector(".header-menu-ip-list-button-icon").src = `../assets/projects/${localStorage.getItem("project").toLowerCase().replace(" ", "-")}.png`;

window.addEventListener("DOMContentLoaded", () => {
  const testnetTabButton = document.getElementById("testnet-tab-button");
  const mainnetTabButton = document.getElementById("mainnet-tab-button");
  const testnetTabContent = document.getElementById("testnet-tab-content");
  const mainnetTabContent = document.getElementById("mainnet-tab-content");
  const nodeIcons = document.querySelector(".header-node-icons");
  const headerMenu = document.querySelector(".header-menu");
  const headerMenuIpButton = document.querySelector(".header-menu-ip-list-button");
  const notificationsButton = document.getElementById("notifications-button");
  const logoutButton = document.getElementById("logout-button");
  const submenuIpList = document.querySelector(".header-submenu-ip-list");
  const scrollbarBackground = document.querySelector(".header-menu-scroll-background");
  const submenuNotifications = document.querySelector(".header-submenu-notifications");

  showTestnetProjects();

  for (let i = 0; i < ipAddresses.length; i++) {
    ipListItem = document.createElement("div");
    ipListItem.setAttribute("class", "each-header-submenu-ip-list-item");
    ipListItemIcon = document.createElement("img");
    ipListItemIcon.setAttribute("src", `../assets/projects/${ipAddresses[i].icon.toLowerCase().replace(" ", "-")}.png`);
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

      notifications = localStorage.getItem("notifications") ? JSON.parse(localStorage.getItem("notifications")) : [];
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
    }
    else if (logoutButton.contains(e.target)) {
      showLoadingAnimation();
      invoke("cpu_mem_sync_stop", { a: true });
      setTimeout(() => {
        invoke("log_out");
        hideLoadingAnimation();
        loadNewPage("../index.html");
      }, 5000);
    }
    else {
      headerMenu.setAttribute("style", "display: none;");
      submenuIpList.setAttribute("style", "display: none;");
      scrollbarBackground.setAttribute("style", "display: none;");
      submenuNotifications.setAttribute("style", "display: none;");
    }
  });
});

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

function loadNewPage(pagename) {
  window.location.href = pagename;
}

async function showTestnetProjects() {
  const client = await getClient();
  const authenticate = await client.post('https://admin.node101.io/api/authenticate', {
    type: 'Json',
    payload: { key: "b8737b4ca31571d769506c4373f5c476e0a022bf58d5e0595c0e37eabb881ad150b8c447f58d5f80f6ffe5ced6f21fe0502c12cf32ab33c6f0787aea5ccff153" },
  });

  let count = 0;
  let projects = [];
  while (true) {
    projectsData = await client.get(`https://admin.node101.io/api/projects?page=${count}`, {
      type: 'Json',
      headers: {
        'Cookie': authenticate.headers['set-cookie']
      }
    })
    count++;
    if (projectsData.data.projects.length == 0) {
      break;
    }
    projects.push(...projectsData.data.projects);
  }

  document.getElementById('testnet-tab-content').innerHTML = "";

  for (let i = 0; i < projects.length; i++) {
    row = document.createElement("div");
    row.setAttribute("class", "each-node-page-project");

    //Project Header Part
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

    //Project Description Part
    description = document.createElement("div");
    description.setAttribute("class", "project-description");
    description.textContent = projects[i].description;
    row.appendChild(description);

    //Project Buttons Part
    buttons = document.createElement("div");
    buttons.setAttribute("class", "project-buttons");

    //Install Button
    installButton = document.createElement("button");
    installButton.setAttribute("class", "each-project-button install-button");
    textDiv = document.createElement("div");
    textDiv.textContent = "Install Node";
    installButtonSVG = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    installButtonSVG.setAttribute("class", "each-project-button-svg");
    installButtonSVG.setAttribute("width", "14");
    installButtonSVG.setAttribute("height", "14");
    installButtonSVG.setAttribute("viewBox", "0 0 14 14");
    path1 = document.createElementNS('http://www.w3.org/2000/svg', `path`);
    path1.setAttribute("d", "M 12.656854,8.1649583 11.949748,7.4578515 7.4985105,11.909089 V 0.17818725 H 6.5014899 V 11.909089 L 2.0502527,7.4578515 1.343146,8.1649583 7.0000002,13.821813 Z");
    installButtonSVG.appendChild(path1);
    installButton.appendChild(textDiv);
    installButton.appendChild(installButtonSVG)
    installButton.addEventListener("click", function () {
      console.log(projects[i].wizard_key);
      localStorage.setItem('installation', 'true');
      invoke("install_node");
      window.location.href = '../manage-node/manage-node.html';
    });

    //Discover Button
    discoverButton = document.createElement("button");
    discoverButton.setAttribute("class", "each-project-button discover-button");
    textDiv2 = document.createElement("div");
    textDiv2.textContent = "Discover Node";
    discoverButtonSVG = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    discoverButtonSVG.setAttribute("class", "each-project-button-svg");
    discoverButtonSVG.setAttribute("width", "10");
    discoverButtonSVG.setAttribute("height", "10");
    discoverButtonSVG.setAttribute("viewBox", "0 0 10 10");
    path2 = document.createElementNS('http://www.w3.org/2000/svg', `path`);
    path2.setAttribute("d", "M2 0V1H8.295L0 9.295L0.705 10L9 1.705V8H10V0H2Z");

    discoverButtonSVG.appendChild(path2);
    discoverButton.appendChild(textDiv2);
    discoverButton.appendChild(discoverButtonSVG)
    buttons.appendChild(installButton);
    buttons.appendChild(discoverButton);
    row.appendChild(buttons);
    document.getElementById('testnet-tab-content').appendChild(row);
  }

  names = projects.map(item => item.name);
}