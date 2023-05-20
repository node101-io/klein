const { tauri, dialog, clipboard, http, event: tevent, window: twindow } = window.__TAURI__;

const handleRighClick = (e) => {
  if (e.target.tagName === "INPUT" && e.target.type == "text") return;
  e.preventDefault();
};

window.addEventListener("DOMContentLoaded", async () => {
  window.addEventListener("contextmenu", handleRighClick);

  prevent_close = false;
  (async () => {
    await twindow.appWindow.onCloseRequested(async (event) => {
      if (prevent_close && !(await dialog.confirm("Installation will be cancelled. Are you sure you want to exit?"))) {
        event.preventDefault();
      };
    });
  })();

  document.body.style.zoom = localStorage.getItem("zoom") || 1;
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey) {
      if (e.key == "-" && document.body.style.zoom > 0.8) {
        e.preventDefault();
        document.body.style.zoom = document.body.style.zoom - 0.1;
      }
      else if (e.key == "4" && document.body.style.zoom < 1.2) {
        e.preventDefault();
        document.body.style.zoom = parseFloat(document.body.style.zoom) + 0.1;
      }
      else if (e.key == "0") {
        e.preventDefault();
        document.body.style.zoom = 1;
      };
      localStorage.setItem("zoom", document.body.style.zoom);
    };
  });

  setupLoginPage();
  setupNodePage();
  setupHomePage();
  setupHeader();
  loadLoginPage();
});