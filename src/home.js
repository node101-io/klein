const loadHomePage = async () => {
    document.getElementById("testnet-tab-button").click();
    updateHeader();
    await showTestnetProjects();
    document.querySelector(".all-installation-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".all-header-wrapper").style.display = "flex";
    document.querySelector(".all-login-wrapper").style.display = "none";
    document.querySelector(".all-node-wrapper").style.display = "none";
    document.querySelector(".all-home-wrapper").style.display = "flex";
    hideLoadingAnimation();
};

const cancelInstallation = async () => {
    showLoadingAnimation();
    await tauri.invoke("stop_installation").catch((e) => console.log(e));
    await tauri.invoke("delete_node", { exception: exception }).then(async () => {
        currentIp.icon = "Empty Server";
        currentIp.validator_addr = "";
        localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
        loadHomePage();
    }).catch((err) => {
        console.log(err);
        dialog.message(err, { title: "Error", type: "error" });
        hideLoadingAnimation();
    });
};
const closeInstallation = async () => {
    await loadNodePage(true);
};

const showTestnetProjects = async () => {
    const installationInfoIcon = document.querySelector(".installation-info-icon");
    const installationInfoTitle = document.querySelector(".installation-info-title");
    const progressBar = document.querySelector(".progress-bar");
    const cancelInstallationButton = document.getElementById("cancel-installation-button");
    const cancelInstallationButtonName = document.getElementById("cancel-installation-button-name");
    const progressBarTextLeft = document.querySelector(".progress-bar-text-left");
    const progressBarSuccessIcon = document.querySelectorAll(".each-progress-bar-status-icon")[0];
    const progressBarErrorIcon = document.querySelectorAll(".each-progress-bar-status-icon")[1];
    const testnetTabContent = document.getElementById('testnet-tab-content');
    let gonna_prepend = "";
    testnetTabContent.innerHTML = "";

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
            if (await dialog.confirm("Node is going to be installed, please confirm.", projects[i].project.name)) {
                // const client = await http.getClient();
                // const videos = await client.get("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=PL5c21nTlaW9Pu58608pF0HM9e9_T-hZIK&key=" + GOOGLE_API, {
                //     type: "Json"
                // });
                // let video_id = "";
                // for (let i = 0; i < videos.data.items.length; i++) {
                //     if (videos.data.items[i].snippet.title.includes(currentIp.icon.split(" ")[0])) {
                //         video_id = videos.data.items[i].snippet.resourceId.videoId;
                //         break;
                //     }
                // }
                // document.querySelector(".page-video").src = `https://www.youtube.com/embed/${video_id ? video_id : "VnWTTcixqds"}?color=white&rel=0&widget_referrer=https://www.node101.io/wizard`;
                prevent_close = true;
                currentIp.icon = projects[i].project.name;
                localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                exception = currentIp.icon == "Celestia Light" ? "celestia-lightd" : "";

                installationInfoIcon.src = projects[i].project.image;
                installationInfoTitle.textContent = projects[i].project.name;
                progressBar.className = "progress-bar progress-bar-loading";
                progressBarTextLeft.textContent = "Installing...";
                progressBarSuccessIcon.style.display = "none";
                progressBarErrorIcon.style.display = "none";

                cancelInstallationButton.removeEventListener("click", closeInstallation);
                cancelInstallationButton.addEventListener("click", cancelInstallation);
                cancelInstallationButtonName.textContent = "Cancel";
                cancelInstallationButtonName.style.color = "rgba(250, 77, 86, 1)";
                document.querySelector(".all-home-wrapper").style.display = "none";
                document.querySelector(".all-installation-wrapper").style.display = "flex";

                (async () => {
                    for (let i = 0; i < 100; i++) {
                        if (!prevent_close) break;
                        document.querySelector(".progress-bar").setAttribute("value", i);
                        document.querySelector(".progress-bar-text-right").textContent = `${i}%`;
                        await new Promise(r => setTimeout(r, i * i / 0.015));
                    }
                })();

                await tauri.invoke("install_node", { network: sessionStorage.getItem("current_tab"), identifier: projects[i].project.identifier }).then(async () => {
                    if (exception == "celestia-lightd") {
                        await tauri.invoke("delete_wallet", { walletname: "my_celes_key", exception: exception }).catch((err) => { console.log(err); });
                        await tauri.invoke("create_wallet", { walletname: "my_celes_key", exception: exception })
                            .then((mnemonic) => dialog.message(mnemonic, { title: "Keep your mnemonic private and secure. It's the only way to acces your wallet.", type: "info" }))
                            .catch((err) => { console.log(err) });
                        await tauri.invoke("set_main_wallet", { walletname: "my_celes_key", exception: exception }).catch((err) => { console.log(err); });
                        await tauri.invoke("show_wallets", { exception: exception }).then(async (list) => {
                            console.log(list);
                            list = list.length ? JSON.parse(list) : [];
                            currentIp.validator_addr = list[0].address;
                            localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                            await updateSidebar();
                        }).catch((err) => {
                            console.log(err);
                        });
                    };

                    document.querySelector(".progress-bar-text-right").textContent = "100%";
                    document.querySelector(".progress-bar").setAttribute("value", "100");
                    progressBarTextLeft.textContent = "Installation done!";
                    progressBarSuccessIcon.style.display = "unset"
                    progressBar.className = "progress-bar progress-bar-success";

                    cancelInstallationButton.className = "each-button";
                    cancelInstallationButtonName.style.color = "unset";
                    cancelInstallationButtonName.textContent = "Dive In!";

                    cancelInstallationButton.removeEventListener("click", cancelInstallation);
                    cancelInstallationButton.addEventListener("click", closeInstallation);
                }).catch((err) => {
                    progressBar.className = "progress-bar progress-bar-error";
                    progressBarErrorIcon.style.display = "unset";
                    progressBarTextLeft.textContent = "Installation failed!";
                });
                prevent_close = false;
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
            gonna_prepend = row;
        }
    }
    if (gonna_prepend) {
        testnetTabContent.prepend(gonna_prepend);
        document.querySelector(".install-button").replaceWith(document.querySelector(".install-button").cloneNode(true));
        document.querySelector(".install-button").addEventListener("click", function () {
            loadNodePage(true);
        });
        document.querySelector(".install-button").firstChild.textContent = "Manage";
        document.querySelector(".install-button").firstChild.nextSibling.style.transform = "rotate(-90deg)";
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
};