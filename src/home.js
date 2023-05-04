const loadHomePage = async () => {
    document.getElementById("testnet-tab-button").click();
    sessionStorage.setItem("current_tab", "testnet");
    updateHeader();
    await showTestnetProjects();
    document.querySelector(".all-header-wrapper").style.display = "flex";
    document.querySelector(".all-login-wrapper").style.display = "none";
    document.querySelector(".all-node-wrapper").style.display = "none";
    document.querySelector(".all-home-wrapper").style.display = "flex";
    hideLoadingAnimation();
}

const showTestnetProjects = async () => {
    const testnetTabContent = document.getElementById('testnet-tab-content');
    testnetTabContent.innerHTML = "";
    let gonnaPrepend = "";

    for (let i = 0; i < projects.length; i++) {
        console.log(projects[i].project);
        row = document.createElement("div");
        row.classList.add("each-node-page-project");
        header = document.createElement("div");
        header.classList.add("project-header");
        headerIcon = document.createElement("img");
        headerIcon.classList.add("project-icon");
        headerIcon.src = projects[i].project.image;
        header.appendChild(headerIcon);
        details = document.createElement("div");
        details.classList.add("project-details")
        detailsHeading = document.createElement("div");
        detailsHeading.classList.add("project-details-heading");
        detailsHeading.textContent = projects[i].project.name;
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
        rating = document.createElement("div");
        rating.classList.add("project-rating");
        ratingHeading = document.createElement("div");
        ratingHeading.classList.add("project-rating-heading");
        ratingHeading.textContent = "Rating"
        rating.appendChild(ratingHeading);
        ratingScore = projects[i].project.rating;

        for (let j = 0; j < 5; j++) {
            ratingCircle = document.createElement("span");
            ratingCircle.classList.add("each-project-rating-value");
            ratingCircleOn = document.createElement("span");
            ratingCircleOn.classList.add("each-project-rating-value-on");
            if (ratingScore != 0) {
                ratingCircleOn.style.display = "unset";
                ratingScore = ratingScore - 1;
            } else {
                ratingCircleOn.style.display = "none";
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
        description.classList.add("project-description");
        description.textContent = projects[i].project.description;
        row.appendChild(description);
        buttons = document.createElement("div");
        buttons.classList.add("project-buttons");
        installButton = document.createElement("button");
        installButton.classList.add("each-project-button", "install-button");
        textDiv = document.createElement("div");
        textDiv.textContent = "Install Node";
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
            if (await dialog.confirm("Node is going to be installed, please confirm.", projects[i].project.name)) {
                currentIp.icon = projects[i].project.name;
                exception = currentIp.icon == "Celestia Light" ? "celestia-lightd" : "";
                localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));

                await loadNodePage();
                changePage("page-content/installation.html", installationSetup);

                await tauri.invoke("install_node", { network: sessionStorage.getItem("current_tab"), identifier: projects[i].project.identifier }).then(async () => {
                    await tauri.invoke("password_keyring_check", { exception: exception }).then((r) => {
                        sessionStorage.setItem("keyring", `{ "required": ${r[0]}, "exists": ${r[1]} }`);
                    }).catch((e) => {
                        console.log(e);
                    });
                    tauri.invoke("cpu_mem_sync", { exception: exception });
                    document.querySelector(".progress-bar-text-right").textContent = "100%";
                    document.querySelector(".progress-bar").setAttribute("value", "100");
                    document.querySelectorAll(".each-progress-bar-status-icon")[0].style.display = "unset"
                    document.querySelector(".progress-bar-text-left").textContent = "Installation done!";

                    if (exception) {
                        await tauri.invoke("show_wallets", { exception: exception }).then(async (list) => {
                            console.log(list);
                            list = list.length ? JSON.parse(list) : [];
                            currentIp.validator_addr = list[0].address;
                            localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                            await updateSidebar();
                        }).catch((err) => {
                            console.log(err);
                        });
                    }
                }).catch((err) => {
                    console.log(err);
                    document.querySelectorAll(".each-progress-bar-status-icon")[1].style.display = "unset"
                    document.querySelector(".progress-bar-text-left").textContent = "Installation failed!";
                });
            };
        });
        discoverButton = document.createElement("a");
        discoverButton.classList.add("each-project-button", "discover-button");
        discoverButton.setAttribute("target", "_blank");
        discoverButton.setAttribute("href", projects[i].project.social_media_accounts.web);
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
        testnetTabContent.appendChild(row);
        if (projects[i].project.name == currentIp.icon) {
            gonnaPrepend = row;
        }
    }
    if (gonnaPrepend) {
        testnetTabContent.prepend(gonnaPrepend);
        document.querySelector(".install-button").replaceWith(document.querySelector(".install-button").cloneNode(true));
        document.querySelector(".install-button").addEventListener("click", function () {
            loadNodePage(true);
        });
        document.querySelector(".install-button").firstChild.textContent = "Manage Node";
        document.querySelector(".install-button").firstChild.nextSibling.style.transform = "rotate(-90deg)";
        // document.querySelector(".install-button").firstChild.nextSibling.setAttribute("style", "transform: rotate(-90deg);");
        for (let i = 1; i < document.querySelectorAll(".install-button").length; i++) {
            document.querySelectorAll(".install-button")[i].disabled = true;
        }
    }
}

const setupHomePage = () => {
    const testnetTabButton = document.getElementById("testnet-tab-button");
    const mainnetTabButton = document.getElementById("mainnet-tab-button");
    const testnetTabContent = document.getElementById("testnet-tab-content");
    const mainnetTabContent = document.getElementById("mainnet-tab-content");

    testnetTabButton.addEventListener("click", () => {
        sessionStorage.setItem("current_tab", "testnet");
        testnetTabButton.classList.add("each-nodes-page-tab", "active-tab");
        mainnetTabButton.classList.add("each-nodes-page-tab");
        mainnetTabContent.style.display = "none";
        testnetTabContent.style.display = "flex";
    });
    mainnetTabButton.addEventListener("click", () => {
        sessionStorage.setItem("current_tab", "mainnet");
        testnetTabButton.classList.add("each-nodes-page-tab");
        mainnetTabButton.classList.add("each-nodes-page-tab", "active-tab");
        testnetTabContent.style.display = "none";
        mainnetTabContent.style.display = "flex";
    });
};