const { invoke } = window.__TAURI__.tauri;

let ipInputEl = document.getElementById("ip-input");
let passwordInputEl = document.getElementById("password-input");
let visibilityToggleEl = document.getElementById("visibility-toggle")
let names = ["Ayla", "Jake", "Sean", "Henry", "Brad", "Stephen", "Taylor", "Timmy", "Cathy", "John", "Amanda", "Amara", "Sam", "Sandy", "Danny", "Ellen", "Camille", "Chloe", "Emily", "Nadia", "Mitchell", "Harvey", "Lucy", "Amy", "Glen", "Peter"];

let currenFocus;

ipInputEl.addEventListener("input", function(e) {
  var a, b, i, val = this.value;
  /*close any already open lists of autocompleted values*/
  closeAllLists();
  if (!val) { return false;}
  currentFocus = -1;
  /*create a DIV element that will contain the items (values):*/
  a = document.createElement("div");
  a.setAttribute("id", this.id + "autocomplete-list");
  a.setAttribute("class", "autocomplete-items");
  /*append the DIV element as a child of the autocomplete container:*/
  this.parentNode.appendChild(a);
  /*for each item in the array...*/
  for (i = 0; i < names.length; i++) {
    if (names[i].toLowerCase().includes(val.toLowerCase())) {
      /*create a DIV element for each matching element:*/
      b = document.createElement("div");
      b.innerHTML = names[i];
      /*insert a input field that will hold the current array item's value:*/
      b.innerHTML += "<input type='hidden' value='" + names[i] + "'>";
      /*execute a function when someone clicks on the item value (DIV element):*/
      b.addEventListener("click", function(e) {
          /*insert the value for the autocomplete text field:*/
          ipInputEl.value = this.getElementsByTagName("input")[0].value;
          closeAllLists();
      });
      a.appendChild(b);
    }
  }
});

/*execute a function presses a key on the keyboard:*/
ipInputEl.addEventListener("keydown", function(e) {
  var x = document.getElementById(this.id + "autocomplete-list");
  if (x) x = x.getElementsByTagName("div");
  if (e.keyCode == 40) {
    currentFocus++;
    addActive(x);
  } else if (e.keyCode == 38) { //up
    currentFocus--;
    addActive(x);
  } else if (e.keyCode == 13) {
    if (currentFocus > -1) {
      /*and simulate a click on the "active" item:*/
      if (x) x[currentFocus].click();
    }
  }
});

function addActive(x) {
  /*a function to classify an item as "active":*/
  if (!x) return false;
  /*start by removing the "active" class on all items:*/
  /*a function to remove the "active" class from all autocomplete items:*/
  for (var i = 0; i < x.length; i++) {
    x[i].classList.remove("autocomplete-active");
  }
  if (currentFocus >= x.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = (x.length - 1);
  /*add class "autocomplete-active":*/
  x[currentFocus].classList.add("autocomplete-active");
}
function closeAllLists(elmnt) {
  /*close all autocomplete lists in the document,
  except the one passed as an argument:*/
  var x = document.getElementsByClassName("autocomplete-items");
  for (var i = 0; i < x.length; i++) {
    if (elmnt != x[i] && elmnt != inp) {
      x[i].parentNode.removeChild(x[i]);
    }
  }
}
/*execute a function when someone clicks in the document:*/
document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});







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
