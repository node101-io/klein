const loadLoginPage = async () => {
    await fetchProjects();
    document.querySelector(".all-header-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".all-login-wrapper").setAttribute("style", "display: unset;");
    document.querySelector(".all-node-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".all-home-wrapper").setAttribute("style", "display: none;");
    hideLoadingAnimation();
}

const setupLoginPage = () => {
    const ipInputEl = document.getElementById("ip-input");
    const passwordInputEl = document.getElementById("password-input");
    const autocompleteListEl = document.getElementById("ip-input-autocomplete-list");
    const dropdownToggleEl = document.querySelectorAll(".each-login-page-toggle")[0];
    const visibilityToggleEl1 = document.querySelectorAll(".each-login-page-toggle")[1];
    const visibilityToggleEl2 = document.querySelectorAll(".each-login-page-toggle")[2];
    const selectedItemEl = document.getElementById("selected-item");
    const loginButtonEl = document.querySelector(".login-page-login-button");
    const checkboxInputEl = document.getElementById("checkbox-input");
    const warningEl = document.querySelector(".warning");
    const warningElText = document.querySelector(".warning-text");

    const highlightItem = (x) => {
        if (x.length > 1) {
            for (var i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            }
            focusedIndex = (focusedIndex + x.length - 2) % (x.length - 1) + 1;
            x[focusedIndex].classList.add("autocomplete-active");
        }
    }

    const showSelectedItem = (ip, icon) => {
        ipInputEl.value = ip
        ipInputEl.setAttribute("style", "display: none;");
        selectedItemEl.setAttribute("style", "display: flex;");
        selectedItemEl.children[0].setAttribute("src", projects.find(item => item.project.name == icon) ? projects.find(item => item.project.name == icon).project.image : "assets/default.png");
        selectedItemEl.children[1].textContent = icon;
        selectedItemEl.children[2].textContent = ip;
    }

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
        }
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
                div.appendChild(img);
                div.appendChild(div1);
                div.appendChild(div2);
                autocompleteListEl.appendChild(div);
            }
        }
    });

    selectedItemEl.addEventListener("click", function () {
        selectedItemEl.setAttribute("style", "display: none;");
        ipInputEl.setAttribute("style", "display: unset;");
        ipInputEl.focus();
    });

    passwordInputEl.addEventListener("keydown", function (e) {
        if (e.key == "Enter") {
            loginButtonEl.click();
        }
    });

    loginButtonEl.addEventListener("click", function () {
        if (ipInputEl.value == "" || passwordInputEl.value == "" || !/^(\d{1,3}\.){3}\d{1,3}$/g.test(ipInputEl.value)) {
            warningElText.textContent = "Please enter a valid IP address and password.";
            warningEl.setAttribute("style", "display: flex;");
            warningEl.classList.add("warning-animation");
            setTimeout(() => {
                warningEl.classList.remove("warning-animation");
            }, 500);
            return;
        }
        showLoadingAnimation();
        tauri.invoke("log_in", {
            ip: ipInputEl.value,
            password: "node101bos",
            // password: passwordInputEl.value
        }).then((res) => {
            console.log("res", res);
            warningEl.setAttribute("style", "display: none;");
            currentIp = ipAddresses.find(item => item.ip == ipInputEl.value);
            const project_name = res ? projects.find(item => item.project.wizard_key === res).project.name : "Empty Server";
            if (currentIp) {
                if (currentIp.icon !== project_name) {
                    currentIp.icon = project_name;
                    currentIp.validator_addr = "";
                }
            } else {
                currentIp = { ip: ipInputEl.value, icon: project_name, validator_addr: "" };
                if (checkboxInputEl.checked) {
                    ipAddresses.push(currentIp);
                }
            }
            localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
            document.querySelector(".selected-item-modify").click();
            ipInputEl.value = "";
            passwordInputEl.value = "";
            res ? loadNodePage(true) : loadHomePage();
        }).catch((err) => {
            console.log(err);
            warningElText.textContent = err;
            warningEl.setAttribute("style", "display: flex;");
            warningEl.classList.add("warning-animation");
            setTimeout(() => {
                warningEl.classList.remove("warning-animation");
            }, 500);
            hideLoadingAnimation();
        });
    });

    window.addEventListener("click", function (e) {
        if (e.target == dropdownToggleEl && !autocompleteListEl.innerHTML) {
            ipInputEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
        else {
            autocompleteListEl.innerHTML = "";
        }
    });
};