const { invoke } = window.__TAURI__.tauri;
const { readTextFile, writeFile } = window.__TAURI__.fs;

const observer = new MutationObserver((mutations) => {
  if (document.getElementById('ip-input-autocomplete-list').innerText === '') {
    document.getElementById('menu-toggle').src = "assets/down-arrowhead.png";
  }
  else {
    document.getElementById('menu-toggle').src = "assets/up-arrowhead.png";
  }
});
observer.observe(document.getElementById('ip-input-autocomplete-list'), { childList: true });

function passwordVisibility() {
  visibilityToggleEl = document.getElementById("visibility-toggle");
  passwordInputEl = document.getElementById("password-input");

  if (passwordInputEl.type === "password") {
    passwordInputEl.type = "text";
    visibilityToggleEl.src = "assets/eye-on.png";
  } else {
    passwordInputEl.type = "password";
    visibilityToggleEl.src = "assets/eye-off.png";
  }
}

function showItems() {
  if (document.getElementById('menu-toggle').src.includes("up-arrowhead")) {
    document.getElementById("ip-input-autocomplete-list").innerHTML = "";
  }
  else {
    document.getElementById("ip-input").dispatchEvent(new Event('input', { 'bubbles': true, 'cancelable': true }));
  }
}

function logIn() {
  invoke("log_in", { ip: document.getElementById("ip-input").value, password: document.getElementById("password-input").value, remember: document.getElementById("checkbox-input").checked });
}

function showLoginError() {
  document.getElementsByClassName("login-page-warning")[0].style = "display: ''";
}

function loadNewPage(pagename) {
  fetch(`/${pagename}.html`)
    .then(response => response.text())
    .then(html => {
      document.querySelector('html').innerHTML = html;
    });
}

function showSelectedItem(ip, icon) {
  ipInputEl = document.getElementById("ip-input");
  selectedItemEl = document.getElementById("selected-item");
  
  ipInputEl.value = this.children[2].textContent
  ipInputEl.style.display = 'none'
  selectedItemEl.style.display = 'inline-flex'
  selectedItemEl.children[0].src = `assets/${icon.toLowerCase()}.png`
  selectedItemEl.children[1].textContent = icon
  selectedItemEl.children[2].textContent = ip
}

function hideSelectedItem(obj) {
  obj.style.display = 'none'
  document.getElementById('ip-input').style.display = ''
  document.getElementById('ip-input').focus()
}

window.addEventListener("DOMContentLoaded", () => {

  let ipInputEl = document.getElementById("ip-input");
  let autocompleteList = document.getElementById("ip-input-autocomplete-list");

  let ipAddresses;

  readTextFile('ipaddresses.json').then((data) => {
    ipAddresses = JSON.parse(data);
    // writeFile('ipaddresses.json', JSON.stringify(ipAddresses));
  });

  let focusedIndex;



  ipInputEl.addEventListener("input", function() {
    var b;
    autocompleteList.innerHTML = "";
    focusedIndex = -1;
    for (let i = 0; i < ipAddresses.length; i++) {
      if (ipAddresses[i].ip.toLowerCase().includes(ipInputEl.value.toLowerCase()) || ipAddresses[i].icon.toLowerCase().includes(ipInputEl.value.toLowerCase())) {
        b = document.createElement("div");
        b.innerHTML += `
          <img class="each-autocomplete-item-icon" src="assets/${ipAddresses[i].icon.toLowerCase()}.png">
          <div>${ipAddresses[i].icon}</div>
          <div style="margin-left: auto; margin-right: 120px">${ipAddresses[i].ip}</div>
        `;
        b.setAttribute("class", "each-autocomplete-item");
        b.setAttribute("onclick", "showSelectedItem.call(this, '" + ipAddresses[i].ip + "', '" + ipAddresses[i].icon + "')");
        autocompleteList.appendChild(b);
      }
    }
  });

  ipInputEl.addEventListener("keydown", function(e) {
    x = autocompleteList.getElementsByClassName("each-autocomplete-item");
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

  document.addEventListener("click", function (e) {
    switch (e.target) {
      case document.getElementById("menu-toggle"):
        showItems();
        break;
      case document.getElementById("selected-item"):
        hideSelectedItem(e.target);
      default:
        autocompleteList.innerHTML = "";
        break;
    }
  });

  function addActive(x) {
    if (!x) return false;
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
    if (focusedIndex >= x.length) focusedIndex = 0;
    if (focusedIndex < 0) focusedIndex = (x.length - 1);

    x[focusedIndex].classList.add("autocomplete-active");
  }
});