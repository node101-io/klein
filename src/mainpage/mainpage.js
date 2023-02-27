const { invoke } = window.__TAURI__.tauri;

window.addEventListener("DOMContentLoaded", () => {
  let testnetTabButton = document.getElementById("testnet-tab-button");
  let mainnetTabButton = document.getElementById("mainnet-tab-button");

  testnetTabButton.addEventListener("click", () => {
    testnetTabButton.setAttribute("class", "each-nodes-page-tab active-tab");
    mainnetTabButton.setAttribute("class", "each-nodes-page-tab");
    // sayfa içeriğini değiştir
  });

  mainnetTabButton.addEventListener("click", () => {
    testnetTabButton.setAttribute("class", "each-nodes-page-tab");
    mainnetTabButton.setAttribute("class", "each-nodes-page-tab active-tab");
    // sayfa içeriğini değiştir
  });
});