const { invoke } = window.__TAURI__.tauri;
const { readTextFile, writeFile } = window.__TAURI__.fs;
let ipAddresses;

// Disable right click
// document.addEventListener("contextmenu", event => event.preventDefault());

readTextFile("ipaddresses.json").then((data) => {
  ipAddresses = JSON.parse(data);
});

function passwordVisibility(passwordInputEl) {
  passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
  document.getElementById("visibility-toggle").src = passwordInputEl.type == "password" ? "assets/eye-off.png" : "assets/eye-on.png";
}

function showLoginError() {
  document.querySelector(".login-page-warning").style.removeProperty("display");
}
function loadNewPage(pagename) {
  window.location.href = pagename;
}

function showSelectedItem(ip, icon) {
  let ipInputEl = document.getElementById("ip-input");
  let selectedItemEl = document.getElementById("selected-item");
  
  ipInputEl.value = ip
  ipInputEl.style.setProperty("display", "none");
  selectedItemEl.style.setProperty("display", "flex");
  selectedItemEl.children[0].src = `assets/${icon.toLowerCase()}.png`;
  selectedItemEl.children[1].textContent = icon;
  selectedItemEl.children[2].textContent = ip;
}

window.addEventListener("DOMContentLoaded", () => {
  let ipInputEl = document.getElementById("ip-input");
  let passwordInputEl = document.getElementById("password-input");
  let autocompleteListEl = document.getElementById("ip-input-autocomplete-list");
  let dropdownToggleEl = document.getElementById("menu-toggle");
  let visibilityToggleEl = document.getElementById("visibility-toggle");
  let selectedItemEl = document.getElementById("selected-item");
  let loginButtonEl = document.getElementById("login-button");
  let checkboxInputEl = document.getElementById("checkbox-input");

  new MutationObserver(() => { dropdownToggleEl.src = (autocompleteListEl.innerText == "") ? "assets/down-arrowhead.png" : "assets/up-arrowhead.png"; }).observe(autocompleteListEl, { childList: true });
  
  ipInputEl.addEventListener("keydown", function(e) {
    x = document.querySelectorAll(".each-autocomplete-item");
    if (e.keyCode == 40) {
      focusedIndex++;
      addActive(x);
    }
    else if (e.keyCode == 38) {
      focusedIndex--;
      addActive(x);
    }
    else if (e.keyCode == 13 && focusedIndex > -1) {
      x[focusedIndex].click();
    }
  });

  ipInputEl.addEventListener("input", function() {
    autocompleteListEl.innerHTML = "";
    focusedIndex = 0;
    for (let i = 0; i < ipAddresses.length; i++) {
      if (ipAddresses[i].ip.toLowerCase().includes(ipInputEl.value.toLowerCase()) || ipAddresses[i].icon.toLowerCase().includes(ipInputEl.value.toLowerCase())) {
        div = document.createElement("div");
        div.setAttribute("class", "each-autocomplete-item");
        div.addEventListener("click", function() {
          showSelectedItem.call(this, ipAddresses[i].ip, ipAddresses[i].icon);
        });

        img = document.createElement("img");
        img.setAttribute("class", "each-autocomplete-item-icon");
        img.setAttribute("src", `assets/${ipAddresses[i].icon.toLowerCase()}.png`);

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

  selectedItemEl.addEventListener("click", function() {
    selectedItemEl.style.setProperty("display", "none");
    ipInputEl.style.removeProperty("display");
    ipInputEl.focus();
  });

  visibilityToggleEl.addEventListener("click", function() {
      passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
      visibilityToggleEl.src = passwordInputEl.type == "password" ? "assets/eye-off.png" : "assets/eye-on.png";
  });

  loginButtonEl.addEventListener("click", function() {
    invoke("log_in", { ip: ipInputEl.value, password: passwordInputEl.value, remember: checkboxInputEl.checked });
  });

  function addActive(x) {
    if (x == undefined) return false;
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
    if (focusedIndex >= x.length) focusedIndex = 1;
    else if (focusedIndex < 1) focusedIndex = (x.length - 1);

    x[focusedIndex].classList.add("autocomplete-active");
  }

  document.addEventListener("click", function (e) {
    switch (e.target) {
      case dropdownToggleEl:
        if (dropdownToggleEl.src.includes("up-arrowhead")) {
          autocompleteListEl.innerHTML = "";
        }
        else {
          ipInputEl.dispatchEvent(new Event("input", { "bubbles": true, "cancelable": true }));
        }
        break;
      default:
        autocompleteListEl.innerHTML = "";
        break;
    }
  });
});