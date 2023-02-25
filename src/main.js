const { invoke } = window.__TAURI__.tauri;
const { readTextFile, writeFile } = window.__TAURI__.fs;
let ipAddresses;

// Disable right click
// document.addEventListener('contextmenu', event => event.preventDefault());

readTextFile('ipaddresses.json').then((data) => {
  ipAddresses = JSON.parse(data);
});

function passwordVisibility(passwordInputEl) {
  passwordInputEl.type = passwordInputEl.type === "password" ? "text" : "password";
  document.getElementById('visibility-toggle').src = passwordInputEl.type === "password" ? "assets/eye-off.png" : "assets/eye-on.png";
}

function logIn() {
  invoke("log_in", { ip: document.getElementById("ip-input").value, password: document.getElementById("password-input").value, remember: document.getElementById("checkbox-input").checked });
}
function showLoginError() {
  document.getElementsByClassName("login-page-warning")[0].style = "display: ''";
}
function loadNewPage(pagename) {
  window.location.href = pagename;
}

function showSelectedItem(ip, icon) {
  let ipInputEl = document.getElementById("ip-input");
  let selectedItemEl = document.getElementById("selected-item");
  
  ipInputEl.value = this.children[2].textContent
  ipInputEl.style.display = 'none'
  selectedItemEl.style.display = 'inline-flex'
  selectedItemEl.children[0].src = `assets/${icon.toLowerCase()}.png`
  selectedItemEl.children[1].textContent = icon
  selectedItemEl.children[2].textContent = ip
}
function hideSelectedItem() {
  document.getElementById("selected-item").style.display = 'none'
  document.getElementById('ip-input').style.display = ''
  document.getElementById('ip-input').focus()
}
function createDropdownItems(autocompleteListEl, ipInputEl) {
  autocompleteListEl.innerHTML = "";
  focusedIndex = 0;
  for (let i = 0; i < ipAddresses.length; i++) {
    if (ipAddresses[i].ip.toLowerCase().includes(ipInputEl.value.toLowerCase()) || ipAddresses[i].icon.toLowerCase().includes(ipInputEl.value.toLowerCase())) {
      b = document.createElement("div");
      b.innerHTML += `
        <img class="each-autocomplete-item-icon" src="assets/${ipAddresses[i].icon.toLowerCase()}.png">
        <div>${ipAddresses[i].icon}</div>
        <div style="margin-left: auto; margin-right: 120px">${ipAddresses[i].ip}</div>`;
      b.setAttribute("class", "each-autocomplete-item");
      b.setAttribute("onclick", "showSelectedItem.call(this, '" + ipAddresses[i].ip + "', '" + ipAddresses[i].icon + "')");
      autocompleteListEl.appendChild(b);
    }
  }
};

window.addEventListener("DOMContentLoaded", () => {
  let ipInputEl = document.getElementById("ip-input");
  let autocompleteListEl = document.getElementById("ip-input-autocomplete-list");
  let dropdownToggleEl = document.getElementById("menu-toggle");

  new MutationObserver(() => { dropdownToggleEl.src = (autocompleteListEl.innerText === '') ? "assets/down-arrowhead.png" : "assets/up-arrowhead.png"; }).observe(autocompleteListEl, { childList: true });
  
  ipInputEl.addEventListener("keydown", function(e) {
    x = document.getElementsByClassName("each-autocomplete-item");
    switch (e.keyCode) {
      case 40:
        focusedIndex++;
        addActive(x);
        break;
      case 38:
        focusedIndex--;
        addActive(x);
        break;
      case 13:
        if (focusedIndex > -1) {
          x[focusedIndex].click();
        }
    }
  });

  function addActive(x) {
    console.log(x)
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
          createDropdownItems(autocompleteListEl, ipInputEl);
        }
        break;
      default:
        autocompleteListEl.innerHTML = "";
        break;
    }
  });
});