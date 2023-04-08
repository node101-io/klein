const { tauri, http } = window.__TAURI__;
const { listen } = window.__TAURI__.event;


// alt kısım şimdilik kolaylık olsun diye var kalkacak
localStorage.setItem("ipaddresses", '[{"ip":"144.91.93.154","icon":"Band"},{"ip":"38.242.243.205","icon":"Celestia"}]');
localStorage.setItem("notifications", '[{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":false,"text":"Example notif!"},{"unread":true,"text":"Example notif!"},{"unread":true,"text":"Example notif!"}]');
// üst kısım şimdilik kolaylık olsun diye var kalkacak

const projects = [];
const ipAddresses = localStorage.getItem("ipaddresses") ? JSON.parse(localStorage.getItem("ipaddresses")) : [];

function showSelectedItem(ip, icon) {
  const ipInputEl = document.getElementById("ip-input");
  const selectedItemEl = document.getElementById("selected-item");

  ipInputEl.value = ip
  ipInputEl.setAttribute("style", "display: none;");
  selectedItemEl.setAttribute("style", "display: flex;");
  selectedItemEl.children[0].src = projects.find(project => project.name == icon).image;
  selectedItemEl.children[1].textContent = icon;
  selectedItemEl.children[2].textContent = ip;
}
function highlightItem(x) {
  if (x.length > 1) {
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
    focusedIndex = (focusedIndex + x.length - 2) % (x.length - 1) + 1;
    x[focusedIndex].classList.add("autocomplete-active");
  }
}

async function makeApiRequest() {
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
    console.log(projects_data);
    if (!projects_data.data.projects.length) break;
    projects.push(...projects_data.data.projects);
  }
  sessionStorage.setItem("projects", JSON.stringify(projects));
  hideLoadingAnimation();
}

window.addEventListener("DOMContentLoaded", () => {
  makeApiRequest();

  const ipInputEl = document.getElementById("ip-input");
  const passwordInputEl = document.getElementById("password-input");
  const autocompleteListEl = document.getElementById("ip-input-autocomplete-list");
  const dropdownToggleEl = document.querySelectorAll(".each-login-page-toggle")[0];
  const visibilityToggleEl1 = document.querySelectorAll(".each-login-page-toggle")[1];
  const visibilityToggleEl2 = document.querySelectorAll(".each-login-page-toggle")[2];
  const selectedItemEl = document.getElementById("selected-item");
  const loginButtonEl = document.getElementById("login-button");
  const checkboxInputEl = document.getElementById("checkbox-input");

  new MutationObserver(() => {
    if (autocompleteListEl.innerHTML == "") {
      dropdownToggleEl.setAttribute("style", "transform: rotate(0); transition: 0.5s;");
    }
    else {
      dropdownToggleEl.setAttribute("style", "transform: rotateX(-180deg); transition: 0.5s;");
    }
  }).observe(autocompleteListEl, { childList: true });

  visibilityToggleEl1.addEventListener("click", function () {
    passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
  });
  visibilityToggleEl2.addEventListener("click", function () {
    passwordInputEl.type = passwordInputEl.type == "password" ? "text" : "password";
  });

  new MutationObserver(() => {
    if (passwordInputEl.type == "password") {
      visibilityToggleEl1.setAttribute("style", "display: unset;");
      visibilityToggleEl2.setAttribute("style", "display: none;");
    } else {
      visibilityToggleEl1.setAttribute("style", "display: none;");
      visibilityToggleEl2.setAttribute("style", "display: unset;");
    }
  }).observe(passwordInputEl, { attributes: true });

  ipInputEl.addEventListener("keydown", function (e) {
    x = document.querySelectorAll(".each-autocomplete-item");
    if (e.keyCode == 40) {
      focusedIndex++;
      highlightItem(x);
    }
    else if (e.keyCode == 38) {
      focusedIndex--;
      highlightItem(x);
    }
    else if (e.keyCode == 13 && focusedIndex > -1) {
      x[focusedIndex].click();
    }
  });
  ipInputEl.addEventListener("input", function () {
    autocompleteListEl.innerHTML = "";
    focusedIndex = 0;
    for (let i = 0; i < ipAddresses.length; i++) {
      if (ipAddresses[i].ip.toLowerCase().includes(ipInputEl.value.toLowerCase()) || ipAddresses[i].icon.toLowerCase().includes(ipInputEl.value.toLowerCase())) {
        div = document.createElement("div");
        div.setAttribute("class", "each-autocomplete-item");
        div.addEventListener("click", function () {
          showSelectedItem.call(this, ipAddresses[i].ip, ipAddresses[i].icon);
        });
        img = document.createElement("img");
        img.setAttribute("class", "each-autocomplete-item-icon");
        img.setAttribute("src", projects.find(project => project.name == ipAddresses[i].icon).image);
        div1 = document.createElement("div");
        div1.textContent = ipAddresses[i].icon;
        div2 = document.createElement("div");
        div2.setAttribute("class", "each-autocomplete-item-ip");
        div2.textContent = ipAddresses[i].ip;
        div.appendChild(img);
        div.appendChild(div1);
        div.appendChild(div2);
        autocompleteListEl.appendChild(div);
      }
    }
  });
  selectedItemEl.addEventListener("click", function () {
    selectedItemEl.setAttribute("style", "display: none;");
    ipInputEl.setAttribute("style", "display: unset;");
    ipInputEl.focus();
  });
  loginButtonEl.addEventListener("click", function () {
    if (ipInputEl.value == "" || passwordInputEl.value == "") {
      dialog.message("Please enter your password.");
    }
    else {
      showLoadingAnimation();
      tauri.invoke("log_in", {
        ip: ipInputEl.value,
        password: "node101bos", // passwordInputEl.value
      }).then((res) => {
        const found = projects.reduce((acc, project) => {
          if (project.wizard_key !== null) {
            acc.push(project.wizard_key);
          }
          return acc;
        }, []).find(item => item === res[1]);

        if (res[0]) {
          const ipFound = ipAddresses.find(ip => ip.ip === ipInputEl.value);
          const project = res[1] ? projects.find(item => item.wizard_key === found).name : "";

          if (ipFound) {
            ipFound.icon = project;
          } else if (checkboxInputEl.checked) {
            ipAddresses.push({ ip: ipInputEl.value, icon: project });
          }
          localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
          sessionStorage.setItem("ip", ipInputEl.value);
          sessionStorage.setItem("project", project);
          sessionStorage.setItem("secondpage", found ? "manage-node" : "home-page");
          window.location.href = "../manage-node/manage-node.html";
        }
        else {
          dialog.message("Please check your IP address and password.");
          hideLoadingAnimation();
        }
      });
    }
  });

  document.addEventListener("click", function (e) {
    if (e.target == dropdownToggleEl && !autocompleteListEl.innerHTML) {
      ipInputEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
    else {
      autocompleteListEl.innerHTML = "";
    }
  });
});