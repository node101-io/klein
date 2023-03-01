const { invoke } = window.__TAURI__.tauri;

window.addEventListener("DOMContentLoaded", () => {
  let testnetTabButton = document.getElementById("testnet-tab-button");
  let mainnetTabButton = document.getElementById("mainnet-tab-button");
  let testnetTabContent = document.getElementById("testnet-tab-content");
  let mainnetTabContent = document.getElementById("mainnet-tab-content");
  let nodeIcon = document.querySelector(".header-node-icons");

  testnetTabButton.addEventListener("click", () => {
    testnetTabButton.setAttribute("class", "each-nodes-page-tab active-tab");
    mainnetTabButton.setAttribute("class", "each-nodes-page-tab");
    mainnetTabContent.setAttribute("style", "display: none;");
    testnetTabContent.setAttribute("style", "display: flex;");
  });

  mainnetTabButton.addEventListener("click", () => {
    testnetTabButton.setAttribute("class", "each-nodes-page-tab");
    mainnetTabButton.setAttribute("class", "each-nodes-page-tab active-tab");
    testnetTabContent.setAttribute("style", "display: none;");
    mainnetTabContent.setAttribute("style", "display: flex;");
  });

  nodeIcon.addEventListener("click", () => {
    console.log("clicked");
  });
});