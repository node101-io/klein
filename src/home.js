tevent.listen("installation_progress", (data) => {
    data = data.payload.split(" ")[0]
    if (installation_progress < data) {
        installation_progress = data;
    };
});

const loadHomePage = async () => {
    document.getElementById("testnet-tab-button").click();
    updateHeader();
    await showProjects();
    document.querySelector(".all-installation-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".all-header-wrapper").style.display = "flex";
    document.querySelector(".all-login-wrapper").style.display = "none";
    document.querySelector(".all-node-wrapper").style.display = "none";
    document.querySelector(".all-home-wrapper").style.display = "flex";
    hideLoadingAnimation();
};
const installNode = async (project) => {
    const homeWrapper = document.querySelector(".all-home-wrapper");
    const installationWrapper = document.querySelector(".all-installation-wrapper");
    const installationInfoIcon = document.querySelector(".installation-info-icon");
    const installationInfoTitle = document.querySelector(".installation-info-title");
    const progressBar = document.querySelector(".progress-bar");
    const endInstallationButton = document.getElementById("end-installation-button");
    const progressBarTextLeft = document.querySelector(".progress-bar-text-left");
    const progressBarTextRight = document.querySelector(".progress-bar-text-right");
    const progressBarSuccessIcon = document.querySelectorAll(".each-progress-bar-status-icon")[0];
    const progressBarErrorIcon = document.querySelectorAll(".each-progress-bar-status-icon")[1];
    const onboardingInstallationInfo = document.querySelector(".onboarding-installation-info");

    prevent_close = true;
    currentIp.icon = project.name;
    updateHeader();
    localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
    exception = all_projects.find(item => item.project.name == currentIp.icon)?.project.identifier;

    endInstallationButton.style.display = "none";
    installationInfoIcon.src = project.image;
    installationInfoTitle.textContent = project.name;
    progressBar.className = "progress-bar progress-bar-loading";
    progressBarTextLeft.textContent = "Installing...";
    progressBarSuccessIcon.style.display = "none";
    progressBarErrorIcon.style.display = "none";

    homeWrapper.style.display = "none";
    onboardingInstallationInfo.style.display = ONBOARD_USER ? "flex" : "none";
    installationWrapper.style.display = "flex";

    (async () => {
        installation_progress = 1;
        while (installation_progress < 100) {
            if (!prevent_close) break;
            progressBar.setAttribute("value", installation_progress);
            progressBarTextRight.textContent = `${installation_progress}%`;
            await new Promise(r => setTimeout(r, 12000));
            installation_progress++;
        };
    })();

    await tauri.invoke("install_node", { network: sessionStorage.getItem("current_tab"), identifier: project.identifier }).then(async () => {
        if (exception == "celestia-light") {
            await tauri.invoke("delete_wallet", { walletname: "my_celes_key", exception: exception }).catch((err) => { console.log(err); });
            await tauri.invoke("create_wallet", { walletname: "my_celes_key", exception: exception })
                .then((mnemonic) => createMessage("Please keep this secure.", mnemonic))
                .catch((err) => { console.log(err) });
            await tauri.invoke("show_wallets", { exception: exception }).then(async (list) => {
                list = list.length ? JSON.parse(list) : [];
                currentIp.validator_addr = list[0].address;
                localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
            }).catch((err) => {
                console.log(err);
            });
            await tauri.invoke("set_main_wallet", { walletname: "my_celes_key", address: currentIp.validator_addr, exception: exception }).catch((err) => { console.log(err); });
            await updateSidebar();
        };

        endInstallationButton.style.display = "flex";
        document.querySelector(".progress-bar-text-right").textContent = "100%";
        document.querySelector(".progress-bar").setAttribute("value", "100");
        progressBarTextLeft.textContent = "Installation done!";
        progressBarSuccessIcon.style.display = "unset"
        progressBar.className = "progress-bar progress-bar-success";
    }).catch(async (err) => {
        progressBar.className = "progress-bar progress-bar-error";
        progressBarErrorIcon.style.display = "unset";
        progressBarTextLeft.textContent = "Installation failed!";
        await handleTimeOut(err);
    });
    prevent_close = false;
    twindow.appWindow.requestUserAttention(1);
};
const showProjects = async () => {
    const testnetTabContent = document.getElementById('testnet-tab-content');
    const mainnetTabContent = document.getElementById('mainnet-tab-content');
    let gonna_prepend = "";
    testnetTabContent.innerHTML = "";
    mainnetTabContent.innerHTML = "Coming soon...";

    for (let i = 0; i < all_projects.length; i++) {
        row = document.createElement("div");
        row.classList.add("each-node-page-project");
        header = document.createElement("div");
        header.classList.add("project-header");
        headerIcon = document.createElement("img");
        headerIcon.classList.add("project-icon");
        headerIcon.src = `${all_projects[i].project.image}?${new Date().getTime()}`;
        header.appendChild(headerIcon);
        details = document.createElement("div");
        details.classList.add("project-details")
        detailsHeading = document.createElement("div");
        detailsHeading.classList.add("project-details-heading");
        detailsHeading.textContent = all_projects[i].project.name;
        detailsTags = document.createElement("div");
        detailsTags.classList.add("project-details-tags");
        detailsTagsSpan1 = document.createElement("span");
        // detailsTagsSpan1.classList.add(each-project-detail-tag upcoming-tag");
        // detailsTagsSpan1.textContent = "Upcoming";
        detailsTagsSpan1.classList.add("each-project-detail-tag", "incentivized-tag");
        detailsTagsSpan1.textContent = "Incentivized";
        detailsTagsSpan2 = document.createElement("span");
        detailsTagsSpan2.classList.add("each-project-detail-tag", "active-tag");
        detailsTagsSpan2.textContent = "Active";
        // detailsTags.appendChild(detailsTagsSpan1);
        detailsTags.appendChild(detailsTagsSpan2);
        details.appendChild(detailsHeading);
        details.appendChild(detailsTags);
        header.appendChild(details);
        row.appendChild(header);
        description = document.createElement("div");
        description.classList.add("project-description");
        description.textContent = all_projects[i].project.description;
        row.appendChild(description);
        buttons = document.createElement("div");
        buttons.classList.add("project-buttons");
        installButton = document.createElement("button");
        installButton.classList.add("each-project-button", "install-button");
        textDiv = document.createElement("div");
        textDiv.textContent = "Install";
        installButtonSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        installButtonSVG.classList.add("each-project-button-svg");
        installButtonSVG.style.width = "14px";
        installButtonSVG.style.height = "14px";
        installButtonSVG.setAttribute("viewBox", "0 0 14 14");
        path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path1.setAttribute("d", "M 12.656854,8.1649583 11.949748,7.4578515 7.4985105,11.909089 V 0.17818725 H 6.5014899 V 11.909089 L 2.0502527,7.4578515 1.343146,8.1649583 7.0000002,13.821813 Z");
        installButtonSVG.appendChild(path1);
        installButton.appendChild(textDiv);
        installButton.appendChild(installButtonSVG)
        installButton.addEventListener("click", async function () {
            if (ONBOARD_USER) {
                loadOnboardingLoginPage(all_projects[i]);
            } else {
                if (await dialog.confirm("Node is going to be installed, please confirm.", all_projects[i].project.name)) installNode(all_projects[i].project);
            };
        });
        discoverButton = document.createElement("a");
        discoverButton.classList.add("each-project-button", "discover-button");
        discoverButton.setAttribute("target", "_blank");
        discoverButton.setAttribute("href", all_projects[i].project.social_media_accounts.web);
        textDiv2 = document.createElement("div");
        textDiv2.textContent = "Discover";
        discoverButtonSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        discoverButtonSVG.classList.add("each-project-button-svg");
        discoverButtonSVG.style.width = "10px";
        discoverButtonSVG.style.height = "10px";
        discoverButtonSVG.setAttribute("viewBox", "0 0 10 10");
        path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path2.setAttribute("d", "M2 0V1H8.295L0 9.295L0.705 10L9 1.705V8H10V0H2Z");
        discoverButtonSVG.appendChild(path2);
        discoverButton.appendChild(textDiv2);
        discoverButton.appendChild(discoverButtonSVG)
        buttons.appendChild(installButton);
        buttons.appendChild(discoverButton);
        row.appendChild(buttons);
        // if (all_projects[i].is_mainnet) mainnetTabContent.appendChild(row);
        // else testnetTabContent.appendChild(row);
        if (!all_projects[i].is_mainnet) testnetTabContent.appendChild(row);
        if (!ONBOARD_USER && all_projects[i].project.name == currentIp.icon) { // TODO: Checking by name is not a good idea. Testnet and mainnet can have same name.
            gonna_prepend = row;
            gonna_prepend_is_mainnet = all_projects[i].is_mainnet;
        }
    };
    if (gonna_prepend) {
        // if (gonna_prepend_is_mainnet) mainnetTabContent.prepend(gonna_prepend);
        // else testnetTabContent.prepend(gonna_prepend);
        if (!gonna_prepend_is_mainnet) testnetTabContent.prepend(gonna_prepend);
        gonna_prepend.querySelector(".install-button").replaceWith(gonna_prepend.querySelector(".install-button").cloneNode(true));
        gonna_prepend.querySelector(".install-button").addEventListener("click", function () {
            loadNodePage(true);
        });
        gonna_prepend.querySelector(".install-button").firstChild.textContent = "Manage";
        gonna_prepend.querySelector(".install-button").firstChild.nextSibling.style.transform = "rotate(-90deg)";
        for (let i = 0; i < document.querySelectorAll(".install-button").length; i++) {
            document.querySelectorAll(".install-button")[i].disabled = true;
        };
        gonna_prepend.querySelector(".install-button").disabled = false;
    };
}

const setupHomePage = () => {
    const testnetTabButton = document.getElementById("testnet-tab-button");
    const mainnetTabButton = document.getElementById("mainnet-tab-button");
    const testnetTabContent = document.getElementById("testnet-tab-content");
    const mainnetTabContent = document.getElementById("mainnet-tab-content");
    const endInstallationButton = document.getElementById("end-installation-button");

    testnetTabButton.addEventListener("click", () => {
        sessionStorage.setItem("current_tab", "testnet");
        testnetTabButton.classList.add("active-tab");
        mainnetTabButton.classList.remove("active-tab");
        mainnetTabContent.style.display = "none";
        testnetTabContent.style.display = "flex";
    });
    mainnetTabButton.addEventListener("click", () => {
        sessionStorage.setItem("current_tab", "mainnet");
        testnetTabButton.classList.remove("active-tab");
        mainnetTabButton.classList.add("active-tab");
        testnetTabContent.style.display = "none";
        mainnetTabContent.style.display = "flex";
    });
    endInstallationButton.addEventListener("click", async () => {
        await loadNodePage(true);
    });
};