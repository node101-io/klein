const { invoke } = window.__TAURI__.tauri;

let ipInputEl = document.getElementById("ip-input");
let passwordInputEl = document.getElementById("password-input");
let visibilityToggleEl = document.getElementById("visibility-toggle");
let autocompleteList = document.getElementById("ip-input-autocomplete-list");
let names = ["Afghanistan","Albania","Algeria","Andorra","Angola","Anguilla","Antigua & Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia & Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Cayman Islands","Central Arfrican Republic","Chad","Chile","China","Colombia","Congo","Cook Islands","Costa Rica","Cote D Ivoire","Croatia","Cuba","Curacao","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Polynesia","French West Indies","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guam","Guatemala","Guernsey","Guinea","Guinea Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar","Namibia","Nauro","Nepal","Netherlands","Netherlands Antilles","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","North Korea","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Puerto Rico","Qatar","Reunion","Romania","Russia","Rwanda","Saint Pierre & Miquelon","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","St Kitts & Nevis","St Lucia","St Vincent","Sudan","Suriname","Swaziland","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor L'Este","Togo","Tonga","Trinidad & Tobago","Tunisia","Turkey","Turkmenistan","Turks & Caicos","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Virgin Islands (US)","Yemen","Zambia","Zimbabwe"];

let focusedIndex;

ipInputEl.addEventListener("input", function() {
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