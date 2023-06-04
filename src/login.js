const loadLoginPage = async () => {
    await fetchProjects();
    document.querySelector(".onboarding-page-project").style.display = "none";
    document.querySelector(".login-page-motto").style.display = "unset";
    document.querySelector(".all-installation-wrapper").style.display = "none";
    document.querySelector(".all-header-wrapper").style.display = "none";
    document.querySelector(".all-login-wrapper").style.display = "unset";
    document.querySelector(".all-node-wrapper").style.display = "none";
    document.querySelector(".all-home-wrapper").style.display = "none";
    hideLoadingAnimation();
};

const loadOnboardingLoginPage = async (project) => {
    document.querySelector(".all-installation-wrapper").style.display = "none";
    document.querySelector(".all-header-wrapper").style.display = "none";
    document.querySelector(".all-login-wrapper").style.display = "unset";
    document.querySelector(".all-node-wrapper").style.display = "none";
    document.querySelector(".all-home-wrapper").style.display = "none";

    document.querySelector(".login-page-motto").style.display = "none";
    document.querySelector(".onboarding-page-project").style.display = "unset";
    document.querySelector(".onboarding-page-back-button").addEventListener("click", (e) => {
        e.preventDefault();
        loadHomePage();
    }); document.querySelector(".onboarding-page-project-icon").src = project.image;
    document.querySelector(".onboarding-page-project-details-heading").textContent = project.name;
    rating = document.querySelector(".onboarding-page-project-rating");
    rating.innerHTML = "";
    ratingScore = project.rating;
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
        };
        ratingCircle.appendChild(ratingCircleOn);
        rating.appendChild(ratingCircle);
    };
    document.querySelector(".onboarding-page-project-description").textContent = project.description;
    // temporary
    const requirements = {
        "Celestia Light": [
            "1 Core",
            "2GB",
            "2GB",
            "Ubuntu"
        ],
        "Nibiru": [
            "4 Cores",
            "8GB",
            "200GB",
            "Ubuntu"
        ]
    };
    document.querySelectorAll(".each-onboarding-page-project-req-right").forEach((item, index) => {
        item.textContent = requirements[project.name][index];
    });
};

const logIn = async (ip, password, again) => {
    const checkboxInputEl = document.getElementById("checkbox-input");
    const switchIpPromptClose = document.querySelector(".switch-ip-prompt-close");

    if ((again ? false : (ip.value == "")) || password.value == "" || (again ? false : !/^(\d{1,3}\.){3}\d{1,3}$/g.test(ip.value))) {
        showLogInError("Please fill in all the fields correctly.", again);
        password.focus();
        return;
    };
    showLoadingAnimation();
    await tauri.invoke("log_in", {
        ip: (again ? ip.textContent : ip.value),
        password: password.value
    }).then(async (res) => {
        res = JSON.parse(res);
        await tauri.invoke("cpu_mem_sync_stop").catch((err) => { console.log(err) });
        hideLogInError(again);
        currentIp = ipAddresses.find(item => item.ip == (again ? ip.textContent : ip.value));
        const project_name = res.name ? projects.find(item => item.project.wizard_key === res.name).project.name : "Empty Server";
        if (currentIp) {
            if (currentIp.icon !== project_name) {
                currentIp.icon = project_name;
                currentIp.validator_addr = await tauri.invoke("get_main_wallet").then((res) => {
                    res = JSON.parse(res);
                    return res.address;
                }).catch((err) => { console.log(err); });
            };
        } else {
            currentIp = {
                ip: ip.value,
                icon: project_name,
                validator_addr: await tauri.invoke("get_main_wallet").then((res) => {
                    res = JSON.parse(res);
                    return res.address;
                }).catch((err) => { console.log(err); })
            };
            if (checkboxInputEl.checked) {
                ipAddresses.push(currentIp);
                checkboxInputEl.checked = false;
            };
        };
        localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
        if (again) {
            switchIpPromptClose.click();
        }
        else {
            document.querySelector(".selected-item-modify").click();
            ip.value = "";
        }
        password.value = "";
        // res.name ? await loadNodePage(true) : await loadHomePage();
        exception = currentIp.icon == "Celestia Light" ? "celestia-lightd" : "";

        if (res.name && !res.properly_installed) {
            if (await dialog.ask("This node is not properly installed. Do you want to delete it?")) {
                await deleteNode();
                if (ONBOARD_USER) {
                    await installNode(projects.find(item => item.project.name == document.querySelector(".onboarding-page-project-details-heading").textContent).project);
                    localStorage.setItem("onboard_user", 0);
                    ONBOARD_USER = false;
                };
            };
            await loadNodePage(true);
        } else if (res.name) {
            if (ONBOARD_USER) {
                dialog.message("There is already a node installed!");
                localStorage.setItem("onboard_user", 0);
                ONBOARD_USER = false;
            };
            await loadNodePage(true);
        } else {
            if (ONBOARD_USER) {
                await installNode(projects.find(item => item.project.name == document.querySelector(".onboarding-page-project-details-heading").textContent).project);
                localStorage.setItem("onboard_user", 0);
                ONBOARD_USER = false;
            };
            await loadHomePage();
        };

    }).catch((err) => {
        showLogInError(err, again);
        hideLoadingAnimation();
    });
};
const showLogInError = (err, again) => {
    const warningEl = document.getElementById((again ? "switch-ip-prompt" : "login-page") + "-warning");
    const warningElText = document.getElementById((again ? "switch-ip-prompt" : "login-page") + "-warning-text");

    warningElText.textContent = err;
    warningEl.style.display = "flex";
    warningEl.classList.add("warning-animation");
    setTimeout(() => {
        warningEl.classList.remove("warning-animation");
    }, 500);
};
const hideLogInError = (again) => {
    document.getElementById((again ? "switch-ip-prompt" : "login-page") + "-warning").style.display = "none";
};


const setupLoginPage = () => {
    const ipInputEl = document.getElementById("ip-input");
    const passwordInputEl = document.getElementById("password-input");
    const autocompleteListEl = document.getElementById("ip-input-autocomplete-list");
    const dropdownToggleEl = document.querySelectorAll(".each-login-page-toggle")[0];
    const visibilityToggleEl1 = document.querySelectorAll(".each-login-page-toggle")[1];
    const visibilityToggleEl2 = document.querySelectorAll(".each-login-page-toggle")[2];
    const selectedItemEl = document.getElementById("selected-item");
    const loginButtonEl = document.querySelector(".login-page-login-button");

    ipAddresses = localStorage.getItem("ipaddresses") ? JSON.parse(localStorage.getItem("ipaddresses")) : [];

    const highlightItem = (x) => {
        if (x.length > 1) {
            for (var i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            };
            focusedIndex = (focusedIndex + x.length - 2) % (x.length - 1) + 1;
            x[focusedIndex].classList.add("autocomplete-active");
        };
    };

    const showSelectedItem = (ip, icon) => {
        ipInputEl.value = ip;
        ipInputEl.setAttribute("style", "display: none;");
        selectedItemEl.setAttribute("style", "display: flex;");
        selectedItemEl.children[0].setAttribute("src", projects.find(item => item.project.name == icon) ? projects.find(item => item.project.name == icon).project.image : "assets/default.png");
        selectedItemEl.children[1].textContent = icon;
        selectedItemEl.children[2].textContent = ip;
    };

    new MutationObserver(() => {
        dropdownToggleEl.setAttribute("style", autocompleteListEl.innerHTML == "" ? "transform: rotate(0); transition: 0.5s;" : "transform: rotateX(-180deg); transition: 0.5s;");
    }).observe(autocompleteListEl, { childList: true });

    visibilityToggleEl1.addEventListener("click", function () {
        passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
        visibilityToggleEl1.setAttribute("style", visibilityToggleEl1.style.display == "none" ? "display: unset;" : "display: none;");
        visibilityToggleEl2.setAttribute("style", visibilityToggleEl2.style.display == "none" ? "display: unset;" : "display: none;");
    });

    visibilityToggleEl2.addEventListener("click", function () {
        passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
        visibilityToggleEl1.setAttribute("style", visibilityToggleEl1.style.display == "none" ? "display: unset;" : "display: none;");
        visibilityToggleEl2.setAttribute("style", visibilityToggleEl2.style.display == "none" ? "display: unset;" : "display: none;");
    });

    ipInputEl.addEventListener("keydown", function (e) {
        x = document.querySelectorAll(".each-autocomplete-item");
        if (e.key == "ArrowDown") {
            focusedIndex++;
            highlightItem(x);
        }
        else if (e.key == "ArrowUp") {
            focusedIndex--;
            highlightItem(x);
        }
        else if (e.key == "Enter" && focusedIndex > -1) {
            x[focusedIndex].click();
        };
    });

    ipInputEl.addEventListener("input", function () {
        autocompleteListEl.innerHTML = "";
        focusedIndex = 0;
        for (let i = 0; i < ipAddresses.length; i++) {
            if (ipAddresses[i].ip.toLowerCase().includes(ipInputEl.value.toLowerCase()) || ipAddresses[i].icon.toLowerCase().includes(ipInputEl.value.toLowerCase())) {
                div = document.createElement("div");
                div.setAttribute("class", "each-autocomplete-item");
                div.addEventListener("click", function () {
                    showSelectedItem.call(this, ipAddresses[i].ip, ipAddresses[i].icon);
                });
                img = document.createElement("img");
                img.setAttribute("class", "each-autocomplete-item-icon");
                img.setAttribute("src", projects.find(item => item.project.name == ipAddresses[i].icon) ? projects.find(item => item.project.name == ipAddresses[i].icon).project.image : "assets/default.png");
                div1 = document.createElement("div");
                div1.textContent = ipAddresses[i].icon;
                div2 = document.createElement("div");
                div2.setAttribute("class", "each-autocomplete-item-ip");
                div2.textContent = ipAddresses[i].ip;
                removebutton = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                removebutton.setAttribute("class", "each-autocomplete-item-close");
                removebutton.setAttribute("viewBox", "0 0 24 24");
                removebutton.setAttribute("stroke", "var(--fourth-color)");
                removebutton.setAttribute("stroke-width", "2");
                removebutton.addEventListener("click", function (e) {
                    e.stopPropagation();
                    this.parentElement.remove();
                    ipAddresses.splice(ipAddresses.findIndex(item => item.ip == this.parentElement.children[2].textContent), 1);
                    localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                });
                path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", "M6 18L18 6M6 6l12 12");
                removebutton.appendChild(path);
                div.appendChild(img);
                div.appendChild(div1);
                div.appendChild(div2);
                div.appendChild(removebutton);
                autocompleteListEl.appendChild(div);
            };
        };
    });

    selectedItemEl.addEventListener("click", function () {
        selectedItemEl.setAttribute("style", "display: none;");
        ipInputEl.setAttribute("style", "display: unset;");
        ipInputEl.focus();
    });

    passwordInputEl.addEventListener("keydown", function (e) {
        if (e.key == "Enter") {
            loginButtonEl.click();
        };
    });

    loginButtonEl.addEventListener("click", async function () {
        await logIn(ipInputEl, passwordInputEl, false);
    });

    window.addEventListener("click", function (e) {
        if (e.target == dropdownToggleEl && !autocompleteListEl.innerHTML) ipInputEl.dispatchEvent(new Event("input", { bubbles: true }));
        else autocompleteListEl.innerHTML = "";
    });
};