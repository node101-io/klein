const { tauri, dialog, clipboard, http, event: tevent, window: twindow, updater, process } = window.__TAURI__;

ONBOARD_USER = localStorage.getItem("onboard_user") ? Number(localStorage.getItem("onboard_user")) : 1;

const handleRighClick = (e) => {
  if (e.target.tagName === "INPUT" && e.target.type == "text") return;
  if (e.target.classList.contains("allow-select")) return;
  e.preventDefault();
};

const fetchProjects = async () => {
  const client = await http.getClient();
  const authenticate = await client.post("https://admin.node101.io/api/authenticate", {
    type: "Json",
    payload: { key: API_TOKEN },
  });

  testnet_projects = [];
  mainnet_projects = [];
  for (let count = 0; ; count++) {
    testnets_data = await client.get(`https://admin.node101.io/api/testnets?page=${count}`, {
      type: "Json",
      headers: {
        "Cookie": authenticate.headers["set-cookie"]
      }
    });
    if (!testnets_data.data.testnets.length) break;
    console.log("testnet_data", testnets_data.data.testnets);
    testnet_projects.push(...testnets_data.data.testnets);
  };

  for (let count = 0; ; count++) {
    mainnets_data = await client.get(`https://admin.node101.io/api/mainnets?page=${count}`, {
      type: "Json",
      headers: {
        "Cookie": authenticate.headers["set-cookie"]
      }
    });
    if (!mainnets_data.data.mainnets.length) break;
    console.log("mainnet_data", mainnets_data.data.mainnets);
    mainnet_projects.push(...mainnets_data.data.mainnets);
  }

  all_projects = [...testnet_projects, ...mainnet_projects];
  all_projects.sort((a, b) => a.project.name.localeCompare(b.project.name));
};

const createMessage = (title, message) => {
  const customMessage = document.querySelector(".custom-message");
  const customMessageBackground = document.querySelector(".custom-message-background");
  const customMessageTitle = document.querySelector(".custom-message-content .page-heading");
  const customMessageText = document.querySelector(".custom-message .each-input-label");

  customMessageBackground.style.display = "flex";
  customMessageTitle.textContent = title;
  customMessageText.textContent = message;
  customMessage.style.display = "flex";
};

const loadOnboardPage = () => {
  document.querySelector(".all-login-wrapper").style.display = "unset";
  document.querySelector(".login-page-wrapper").style.display = "none";
  document.querySelector(".start-onboarding-page-wrapper").style.display = "flex";
  hideLoadingAnimation();
};

const changeLanguage = () => {
  document.querySelectorAll("[translation]").forEach((element) => {
    element.textContent = translations[localStorage.getItem("language") || "en"][element.getAttribute("translation")];
  });
};

window.addEventListener("DOMContentLoaded", async () => {
  (async () => {
    const update = await updater.checkUpdate();
    if (update.shouldUpdate && await dialog.ask("Do you want to update now (recommended)? \n\n Release notes:\n" + update.manifest.body, `Version ${update.manifest.version} Available`))
      await updater.installUpdate().then(() => process.relaunch()).catch((e) => console.log(e));
  })();

  const customMessage = document.querySelector(".custom-message");
  const customMessageBackground = document.querySelector(".custom-message-background");
  const customMessageClose = document.querySelector(".custom-message-close");
  const customMessageButton = document.querySelector(".custom-message-button");
  const startOnboardButton = document.getElementById("start-onboard-button");

  startOnboardButton.addEventListener("click", () => {
    loadHomePage();
  });

  customMessageBackground.addEventListener("click", () => {
    customMessageBackground.style.display = "none";
    customMessage.style.display = "none";
  });

  customMessageClose.addEventListener("click", () => {
    customMessage.style.display = "none";
    customMessageBackground.style.display = "none";
  });

  customMessageButton.addEventListener("click", () => {
    customMessageClose.click();
  });

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

  changeLanguage();

  if (ONBOARD_USER) {
    await fetchProjects();
    loadOnboardPage();
  } else
    loadLoginPage();
});