const { tauri, dialog, clipboard, http } = window.__TAURI__;

localStorage.setItem("ipaddresses", '[{"ip":"144.91.93.154","icon":"Babylon"},{"ip":"213.136.73.17","icon":"Nibiru"}]');
localStorage.setItem("notifications", '[{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":true,"text":"Example notif!"},{"unread":true,"text":"Example notif!"}]');

const projects = [];
const ipAddresses = localStorage.getItem("ipaddresses") ? JSON.parse(localStorage.getItem("ipaddresses")) : [];

const fetchProjects = async () => {
  const client = await http.getClient();
  const authenticate = await client.post('https://admin.node101.io/api/authenticate', {
    type: 'Json',
    payload: { key: "b8737b4ca31571d769506c4373f5c476e0a022bf58d5e0595c0e37eabb881ad150b8c447f58d5f80f6ffe5ced6f21fe0502c12cf32ab33c6f0787aea5ccff153" },
  });

  for (let count = 0; ; count++) {
    projects_data = await client.get(`https://admin.node101.io/api/projects?page=${count}`, {
      type: 'Json',
      headers: {
        'Cookie': authenticate.headers['set-cookie']
      }
    })
    if (!projects_data.data.projects.length) break;
    projects.push(...projects_data.data.projects);
  }
  console.log(projects);
}

window.addEventListener("DOMContentLoaded", async () => {
  setupLoginPage();
  setupNodePage();
  setupHomePage();
  setupHeader();
  loadLoginPage();
});