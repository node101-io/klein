const loadHomePage = async () => {
    updateHeader();
    await showTestnetProjects();
    document.querySelector(".all-header-wrapper").setAttribute("style", "display: flex;");
    document.querySelector(".all-login-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".all-node-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".all-home-wrapper").setAttribute("style", "display: flex;");
    hideLoadingAnimation();
}

const showTestnetProjects = async () => {
    const testnetTabContent = document.getElementById('testnet-tab-content');
    testnetTabContent.innerHTML = "";
    let gonnaPrepend = "";

    for (let i = 0; i < projects.length; i++) {
        row = document.createElement("div");
        row.setAttribute("class", "each-node-page-project");
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
        description = document.createElement("div");
        description.setAttribute("class", "project-description");
        description.textContent = projects[i].description;
        row.appendChild(description);
        buttons = document.createElement("div");
        buttons.setAttribute("class", "project-buttons");
        installButton = document.createElement("button");
        installButton.setAttribute("class", "each-project-button install-button");
        textDiv = document.createElement("div");
        textDiv.textContent = "Install Node";
        installButtonSVG = document.createElementNS('http://www.w3.org/2000/svg', "svg");
        installButtonSVG.setAttribute("class", "each-project-button-svg");
        installButtonSVG.setAttribute("width", "14");
        installButtonSVG.setAttribute("height", "14");
        installButtonSVG.setAttribute("viewBox", "0 0 14 14");
        path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path1.setAttribute("d", "M 12.656854,8.1649583 11.949748,7.4578515 7.4985105,11.909089 V 0.17818725 H 6.5014899 V 11.909089 L 2.0502527,7.4578515 1.343146,8.1649583 7.0000002,13.821813 Z");
        installButtonSVG.appendChild(path1);
        installButton.appendChild(textDiv);
        installButton.appendChild(installButtonSVG)
        installButton.addEventListener("click", async function () {
            if (await dialog.confirm("Node is going to be installed, please confirm.", projects[i].name)) {
                localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses.map((ip) => {
                    return ip.ip === currentIp.ip ? { ...ip, icon: currentIp.icon } : ip;
                })));
                currentIp.icon = projects[i].name;
                tauri.invoke("install_node", { identifier: projects[i].identifier });
                await loadNodePage();
                await changePage("page-content/installation.html", installationSetup);
            };
        });
        discoverButton = document.createElement("button");
        discoverButton.setAttribute("class", "each-project-button discover-button");
        textDiv2 = document.createElement("div");
        textDiv2.textContent = "Discover";
        discoverButtonSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        discoverButtonSVG.setAttribute("class", "each-project-button-svg");
        discoverButtonSVG.setAttribute("width", "10");
        discoverButtonSVG.setAttribute("height", "10");
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
        console.log(projects[i].name);
        if (projects[i].name == currentIp.icon) {
            gonnaPrepend = row;
        }
    }
    if (gonnaPrepend) {
        testnetTabContent.prepend(gonnaPrepend);
        document.querySelector(".install-button").replaceWith(document.querySelector(".install-button").cloneNode(true));
        document.querySelector(".install-button").addEventListener("click", function () {
            loadNodePage();
        });
        document.querySelector(".install-button").firstChild.textContent = "Manage Node";
        document.querySelector(".install-button").firstChild.nextSibling.setAttribute("style", "transform: rotate(-90deg);");
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
        console.log("testnet");
        testnetTabButton.setAttribute("class", "each-nodes-page-tab active-tab");
        mainnetTabButton.setAttribute("class", "each-nodes-page-tab");
        mainnetTabContent.setAttribute("style", "display: none;");
        testnetTabContent.setAttribute("style", "display: flex;");
    });
    mainnetTabButton.addEventListener("click", () => {
        console.log("mainnet");
        testnetTabButton.setAttribute("class", "each-nodes-page-tab");
        mainnetTabButton.setAttribute("class", "each-nodes-page-tab active-tab");
        testnetTabContent.setAttribute("style", "display: none;");
        mainnetTabContent.setAttribute("style", "display: flex;");
    });
};