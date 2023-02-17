const { invoke } = window.__TAURI__.tauri;

let ipInputEl;
let passwordInputEl;

async function greet() {
  if (await invoke("greet", { ip: ipInputEl.value, password: passwordInputEl.value })) {
    loadNewPage("newpage");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  ipInputEl = document.querySelector("#ip-input");
  passwordInputEl = document.querySelector("#password-input");
  document
    .querySelector("#greet-button")
    .addEventListener("click", () => greet("newpage"));
});

function loadNewPage(pagename) {
  fetch(`/${pagename}.html`)
    .then(response => response.text())
    .then(html => {
      document.querySelector('html').innerHTML = html;
    });
}