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

    // testnets_data.data.testnets = testnets_data.data.testnets.filter((testnet) => testnet.project.name == "Babylon Bitcoin Staking Testnet");

    // testnets_data.data.testnets.push({
    //   "_id": "6534625d65144dde9d6df3e1",
    //   "project":{
    //     "_id":"653460d365144dde9d6df3cc",
    //     "name":"Babylon Bitcoin Staking Testnet",
    //     "identifier":"babylon",
    //     "description":"The Jackal Protocol provides a decentralized infrastructure for secure and scalable data storage, enabling individuals, developers, and enterprises to protect their data privacy and improve their cybersecurity posture.",
    //     "rating":3,
    //     "image":"https://node101.s3.eu-central-1.amazonaws.com/node101-project-jackal-testnet",
    //     "is_completed":true,
    //     "social_media_accounts":{
    //       "telegram":"https://t.me/+rtuZnbTlHaIzNjVh",
    //       "github":"https://github.com/JackalLabs/canine-chain",
    //       "discord":"https://discord.com/invite/5GKym3p6rj",
    //       "twitter":"https://twitter.com/Jackal_Protocol",
    //       "web":"https://www.jackalprotocol.com/",
    //       "gitbook":"https://docs.jackalprotocol.com/"
    //     },
    //     "translations":{
    //       "tr":{
    //         "name":"Babylon Bitcoin Staking Testnet",
    //         "description":"The Jackal Protocol provides a decentralized infrastructure for secure and scalable data storage, enabling individuals, developers, and enterprises to protect their data privacy and improve their cybersecurity posture.",
    //         "social_media_accounts":{}
    //       },
    //       "ru":{
    //         "name":"Babylon Bitcoin Staking Testnet",
    //         "description":"The Jackal Protocol provides a decentralized infrastructure for secure and scalable data storage, enabling individuals, developers, and enterprises to protect their data privacy and improve their cybersecurity posture.",
    //         "social_media_accounts":{}
    //       }
    //     }
    //   },
    //   "title":"Babylon Bitcoin Staking Testnet",
    //   "subtitle":"The Jackal Protocol provides a decentralized infrastructure for secure and scalable data storage, enabling individuals, developers, and enterprises to protect their data privacy and improve their cybersecurity posture.",
    //   "identifier":"babylon",
    //   "image":"https://node101.s3.eu-central-1.amazonaws.com/node101-guide-jackal-testnet",
    //   "is_completed":true,
    //   "mainnet_explorer_url":null,
    //   "testnet_explorer_url":null,
    //   "rewards":null,"lock_period":null,
    //   "cpu":"4 Cores (modern CPU's)",
    //   "ram":"128GB RAM",
    //   "os":null,
    //   "network":"testnet",
    //   "frequently_asked_questions":[],
    //   "social_media_accounts":{},
    //   "translations":{
    //     "tr":{
    //       "title":"Jackal Testnet",
    //       "subtitle":"The Jackal Protocol provides a decentralized infrastructure for secure and scalable data storage, enabling individuals, developers, and enterprises to protect their data privacy and improve their cybersecurity posture.",
    //       "social_media_accounts":{},
    //       "mainnet_explorer_url":null,
    //       "testnet_explorer_url":null,
    //       "rewards":null,
    //       "lock_period":null,
    //       "cpu":"4 Cores (modern CPU's)",
    //       "ram":"128GB RAM",
    //       "os":null,
    //       "network":"testnet",
    //       "frequently_asked_questions":[]
    //     },
    //     "ru":{
    //       "title":"Jackal Testnet",
    //       "subtitle":"The Jackal Protocol provides a decentralized infrastructure for secure and scalable data storage, enabling individuals, developers, and enterprises to protect their data privacy and improve their cybersecurity posture.",
    //       "social_media_accounts":{},
    //       "mainnet_explorer_url":null,
    //       "testnet_explorer_url":null,
    //       "rewards":null,
    //       "lock_period":null,
    //       "cpu":"4 Cores (modern CPU's)",
    //       "ram":"128GB RAM",
    //       "os":null,
    //       "network":"testnet",
    //       "frequently_asked_questions":[]
    //     }
    //   },
    //   "is_active":false,
    //   "is_mainnet":false,
    //   "wizard_key":"babylond",
    //   "latest_version":null,
    //   "system_requirements":{
    //     "cpu":"4 Cores (modern CPU's)",
    //     "ram":"128GB RAM",
    //     "storage":"3TB of storage (SSD or NVME)"
    //   },
    //   "writing":{
    //     "_id":"6534625d65144dde9d6df3e5",
    //     "title":"Jackal Testnet",
    //     "identifier":"jackal-testnet",
    //     "parent_id":"6534625d65144dde9d6df3e1",
    //     "parent_title":null,
    //     "created_at":"2023-10-21T23:44:29.551Z",
    //     "writer_id":null,
    //     "subtitle":"The Jackal Protocol provides a decentralized infrastructure for secure and scalable data storage, enabling individuals, developers, and enterprises to protect their data privacy and improve their cybersecurity posture.",
    //     "logo":"https://node101.s3.eu-central-1.amazonaws.com/node101-writing-logo-jackal-testnet",
    //     "cover":null,
    //     "content":[],
    //     "is_completed":true,
    //     "label":null,
    //     "flag":null,
    //     "social_media_accounts":{},
    //     "is_hidden":false,
    //     "translations":{
    //       "tr":{
    //         "title":"Jackal Testnet",
    //         "subtitle":"The Jackal Protocol provides a decentralized infrastructure for secure and scalable data storage, enabling individuals, developers, and enterprises to protect their data privacy and improve their cybersecurity posture.",
    //         "logo":null,
    //         "cover":null,
    //         "content":[],
    //         "flag":null,
    //         "social_media_accounts":{},
    //         "is_hidden":false
    //       },
    //       "ru":{
    //         "title":"Jackal Testnet",
    //         "parent_title":null,
    //         "subtitle":"The Jackal Protocol provides a decentralized infrastructure for secure and scalable data storage, enabling individuals, developers, and enterprises to protect their data privacy and improve their cybersecurity posture.",
    //         "logo":null,
    //         "cover":null,
    //         "content":[],
    //         "flag":null,
    //         "social_media_accounts":{},
    //         "is_hidden":false
    //       }
    //     }
    //   }
    // });

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

const checkUpdateAndInstall = async () => {
  const update = await updater.checkUpdate();

  if (update.shouldUpdate && await dialog.ask("Do you want to update now (recommended)? \n\n Release notes:\n" + update.manifest.body, `Version ${update.manifest.version} Available`))
    await updater.installUpdate().then(() => process.relaunch()).catch((e) => console.log(e));
};


window.addEventListener("DOMContentLoaded", async () => {
  if (typeof IS_LOCAL === "undefined") checkUpdateAndInstall();

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