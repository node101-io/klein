const { tauri, dialog, clipboard, http, event: tevent } = window.__TAURI__;

const projects = [];
const ipAddresses = localStorage.getItem("ipaddresses") ? JSON.parse(localStorage.getItem("ipaddresses")) : [];

const fetchProjects = async () => {
  const client = await http.getClient();
  const authenticate = await client.post("https://admin.node101.io/api/authenticate", {
    type: "Json",
    payload: { key: API_TOKEN },
  });

  projects.length = 0;
  for (let count = 0; ; count++) {
    projects_data = await client.get(`https://admin.node101.io/api/testnets?page=${count}`, {
      type: "Json",
      headers: {
        "Cookie": authenticate.headers["set-cookie"]
      }
    })
    if (!projects_data.data.testnets.length) break;
    projects.push(...projects_data.data.testnets);
  }
}

const handleRighClick = (e) => {
  if (e.target.tagName === "INPUT" && e.target.type == "text") return;
  e.preventDefault();
}

window.addEventListener("contextmenu", handleRighClick);

window.addEventListener("DOMContentLoaded", async () => {
  document.body.style.zoom = 1;
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey) {
      if (e.key == "-") {
        e.preventDefault();
        document.body.style.zoom = parseFloat(document.body.style.zoom) - 0.1;
      }
      else if (e.key == "4") {
        e.preventDefault();
        document.body.style.zoom = parseFloat(document.body.style.zoom) + 0.1;
      }
      else if (e.key == "0") {
        e.preventDefault();
        document.body.style.zoom = 1;
      }
    }
  });

  setupLoginPage();
  setupNodePage();
  setupHomePage();
  setupHeader();
  loadLoginPage();
});