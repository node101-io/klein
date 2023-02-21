const { invoke } = window.__TAURI__.tauri;

let ipInputEl = document.getElementById("ip-input");
let passwordInputEl = document.getElementById("password-input");
let visibilityToggleEl = document.getElementById("visibility-toggle");
let autocompleteList = document.getElementById("ip-input-autocomplete-list");
let names = ["Afghanistan","Albania","Amara","Sartuk"];

let focusedIndex;

ipInputEl.addEventListener("input", function() {
  if (ipInputEl.value.length > 0) {
    ipInputEl.style.backgroundColor = "#393939";
  }
  else {
    ipInputEl.style.backgroundColor = "#262626";
  }
  var b;
  autocompleteList.innerHTML = "";
  if (!ipInputEl.value) { return false;}
  focusedIndex = -1;
  for (let i = 0; i < names.length; i++) {
    if (names[i].toLowerCase().includes(ipInputEl.value.toLowerCase())) {
      b = document.createElement("div");
      b.textContent = names[i];
      // b.innerHTML += "<input type='hidden' value='" + names[i] + "'>";
      b.addEventListener("click", function() {
        ipInputEl.value = this.textContent
      });
      autocompleteList.appendChild(b);
    }
  }
});

ipInputEl.addEventListener("keydown", function(e) {
  x = autocompleteList.getElementsByTagName("div");
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
  autocompleteList.innerHTML = "";
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

async function logIn() {
  invoke("log_in", { ip: ipInputEl.value, password: passwordInputEl.value });
}

function toggleVisibility() {
  if (passwordInputEl.type === "password") {
    passwordInputEl.type = "text";
    visibilityToggleEl.src = "assets/eye_on.png";
  } else {
    passwordInputEl.type = "password";
    visibilityToggleEl.src = "assets/eye_off.png";
  }
}

function loadNewPage(pagename) {
  fetch(`/${pagename}.html`)
    .then(response => response.text())
    .then(html => {
      document.querySelector('html').innerHTML = html;
    });
}