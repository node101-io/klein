const { invoke } = window.__TAURI__.tauri;
const { readTextFile, writeFile } = window.__TAURI__.fs;

const observer = new MutationObserver((mutations) => {
  if (document.getElementById('ip-input-autocomplete-list').innerText === '') {
    document.getElementById('menu-toggle').src = "assets/down_arrowhead.png";
  }
  else {
    document.getElementById('menu-toggle').src = "assets/up_arrowhead.png";
  }
});

observer.observe(document.getElementById('ip-input-autocomplete-list'), { childList: true });


function passwordVisibility() {
  visibilityToggleEl = document.getElementById("visibility-toggle");
  passwordInputEl = document.getElementById("password-input");

  if (passwordInputEl.type === "password") {
    passwordInputEl.type = "text";
    visibilityToggleEl.src = "assets/eye_on.png";
  } else {
    passwordInputEl.type = "password";
    visibilityToggleEl.src = "assets/eye_off.png";
  }
}

function showItems() {
  autocompleteList = document.getElementById("ip-input-autocomplete-list");
  showItemsEl = document.getElementById("menu-toggle");
  if (document.getElementById('menu-toggle').src = "assets/up_arrowhead.png") {
    console.log("hiding items");
    autocompleteList.innerHTML = "";
  }
  else {
    console.log("showing items");
    var event = new Event('input', { 'bubbles': true, 'cancelable': true });
    var el = document.getElementById("ip-input");
    el.dispatchEvent(event);
  }
}

async function logIn() {
  invoke("log_in", { ip: document.getElementById("ip-input").value, password: document.getElementById("password-input").value });
}

function loadNewPage(pagename) {
  fetch(`/${pagename}.html`)
    .then(response => response.text())
    .then(html => {
      document.querySelector('html').innerHTML = html;
    });
}

window.addEventListener("DOMContentLoaded", () => {

  let ipInputEl = document.getElementById("ip-input");
  let passwordInputEl = document.getElementById("password-input");
  let autocompleteList = document.getElementById("ip-input-autocomplete-list");

  let ipAddresses;

  readTextFile('ipaddresses.json').then((data) => {
    ipAddresses = JSON.parse(data);
    // writeFile('ipaddresses.json', JSON.stringify(ipAddresses));
  });

  let focusedIndex;

  passwordInputEl.addEventListener("input", function() {
    if (passwordInputEl.value.length > 0) {
      passwordInputEl.style.backgroundColor = "#393939";
    }
    else {
      passwordInputEl.style.backgroundColor = "#262626";
    }
  });

  ipInputEl.addEventListener("input", function() {
    if (ipInputEl.value.length > 0) {
      ipInputEl.style.backgroundColor = "#393939";
    }
    else {
      ipInputEl.style.backgroundColor = "#262626";
    }
    var b;
    autocompleteList.innerHTML = "";
    // if (!ipInputEl.value) { return false;}
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
        b.setAttribute("onclick", "document.getElementById('ip-input').value = this.children[2].textContent");

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
    if (e.target != document.getElementById("menu-toggle")) {
      autocompleteList.innerHTML = "";
    }
    else {
      showItems();
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