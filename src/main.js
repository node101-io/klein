const { invoke } = window.__TAURI__.tauri;
const { readTextFile, writeFile } = window.__TAURI__.fs;
const EYE_ON = "assets/eye-on.png";
const EYE_OFF = "assets/eye-off.png";
let focusedIndex;
let ipAddresses;

// Disable right click:
// document.addEventListener("contextmenu", event => event.preventDefault());

readTextFile("ipaddresses.json").then((data) => {
  ipAddresses = JSON.parse(data);
});

// Functions to be called from Rust
function loadNewPage(pagename, remember, project) {
  if (ipAddresses.some((ip) => ip.ip == document.getElementById("ip-input").value)) {
    ipAddresses.find((ip) => ip.ip == document.getElementById("ip-input").value).icon = project.charAt(0).toUpperCase() + project.slice(1, project.length - 1);
    // writeFile("ipaddresses.json", JSON.stringify(ipAddresses));
  } else if (remember) {
    ipAddresses.push({
      ip: document.getElementById("ip-input").value,
      icon: project.charAt(0).toUpperCase() + project.slice(1, project.length - 1)
    });
    // writeFile("ipaddresses.json", JSON.stringify(ipAddresses));
  }
  // writeFile("node-info-to-display.json", `{"ip": "${document.getElementById('ip-input').value}", "project": "${project.charAt(0).toUpperCase() + project.slice(1, project.length - 1)}"}`);
  hideLoadingAnimation();
  window.location.href = pagename;
}
function showLoginError() {
  hideLoadingAnimation();
  document.querySelector(".login-page-warning").style.removeProperty("display");
}

function showLoadingAnimation() {
  document.querySelector(".all-wrapper").style.setProperty("pointer-events", "none");
  document.querySelector(".all-wrapper").style.setProperty("display", "none");
  document.querySelector(".boxes").style.setProperty("display", "unset");
}
function hideLoadingAnimation() {
  document.querySelector(".boxes").style.setProperty("display", "none");
  document.querySelector(".all-wrapper").style.removeProperty("display");
  document.querySelector(".all-wrapper").style.removeProperty("pointer-events");
}

function showSelectedItem(ip, icon) {
  let ipInputEl = document.getElementById("ip-input");
  let selectedItemEl = document.getElementById("selected-item");

  ipInputEl.value = ip
  ipInputEl.style.setProperty("display", "none");
  selectedItemEl.style.setProperty("display", "flex");
  selectedItemEl.children[0].src = `assets/projects/${icon.toLowerCase()}.png`;
  selectedItemEl.children[1].textContent = icon;
  selectedItemEl.children[2].textContent = ip;
}
function highlightItem(x) {
  if (x.length > 1) {
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
    focusedIndex = (focusedIndex + x.length - 2) % (x.length - 1) + 1;
    x[focusedIndex].classList.add("autocomplete-active");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  let ipInputEl = document.getElementById("ip-input");
  let passwordInputEl = document.getElementById("password-input");
  let autocompleteListEl = document.getElementById("ip-input-autocomplete-list");
  let dropdownToggleEl = document.querySelectorAll(".each-login-page-toggle")[0];
  let visibilityToggleEl1 = document.querySelectorAll(".each-login-page-toggle")[1];
  let visibilityToggleEl2 = document.querySelectorAll(".each-login-page-toggle")[2];
  let selectedItemEl = document.getElementById("selected-item");
  let loginButtonEl = document.getElementById("login-button");
  let checkboxInputEl = document.getElementById("checkbox-input");

  new MutationObserver(() => {
    if (autocompleteListEl.innerHTML == "") {
      dropdownToggleEl.setAttribute("style", "transform: rotate(0); transition: 0.5s;");
    }
    else {
      dropdownToggleEl.setAttribute("style", "transform: rotateX(-180deg); transition: 0.5s;");
    }
  }).observe(autocompleteListEl, { childList: true });

  visibilityToggleEl1.addEventListener("click", function () {
    passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
  });

  visibilityToggleEl2.addEventListener("click", function () {
    passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
  });

  new MutationObserver(() => {
    if (passwordInputEl.type == "password") {
      visibilityToggleEl1.setAttribute("style", "display: unset;");
      visibilityToggleEl2.setAttribute("style", "display: none;");
    } else {
      visibilityToggleEl1.setAttribute("style", "display: none;");
      visibilityToggleEl2.setAttribute("style", "display: unset;");
    }
  }).observe(passwordInputEl, { attributes: true });

  ipInputEl.addEventListener("keydown", function (e) {
    x = document.querySelectorAll(".each-autocomplete-item");
    if (e.keyCode == 40) {
      focusedIndex++;
      highlightItem(x);
    }
    else if (e.keyCode == 38) {
      focusedIndex--;
      highlightItem(x);
    }
    else if (e.keyCode == 13 && focusedIndex > -1) {
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
        img.setAttribute("src", `assets/projects/${ipAddresses[i].icon.toLowerCase()}.png`);
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
    selectedItemEl.style.setProperty("display", "none");
    ipInputEl.style.removeProperty("display");
    ipInputEl.focus();
  });

  loginButtonEl.addEventListener("click", function () {
    if (ipInputEl.value == "" || passwordInputEl.value == "") {
      showLoginError();
    }
    else {
      showLoadingAnimation();
      // invoke("log_in", { ip: ipInputEl.value, password: passwordInputEl.value, remember: checkboxInputEl.checked });
      invoke("log_in", { ip: ipInputEl.value, password: "node101bos", remember: checkboxInputEl.checked });
    }
  });

  document.addEventListener("click", function (e) {
    if (e.target == dropdownToggleEl && !autocompleteListEl.innerHTML) {
      ipInputEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
    else {
      autocompleteListEl.innerHTML = "";
    }
  });
});