const { tauri, dialog, clipboard, http, event: tevent } = window.__TAURI__;

const projects = [];
const ipAddresses = localStorage.getItem("ipaddresses") ? JSON.parse(localStorage.getItem("ipaddresses")) : [];

const fetchProjects = async () => {
  const client = await http.getClient();
  const authenticate = await client.post("https://admin.node101.io/api/authenticate", {
    type: "Json",
    payload: { key: "b8737b4ca31571d769506c4373f5c476e0a022bf58d5e0595c0e37eabb881ad150b8c447f58d5f80f6ffe5ced6f21fe0502c12cf32ab33c6f0787aea5ccff153" },
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
  setupLoginPage();
  setupNodePage();
  setupHomePage();
  setupHeader();
  loadLoginPage();
});