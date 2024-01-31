const warning = {
  show(text) {
    const error = document.querySelector('#login-page-warning');
    const errorText = document.querySelector('#login-page-warning-text');

    errorText.innerHTML = text;
    error.classList.remove('display-none');
    error.classList.add('warning-animation');
    setTimeout(() => {
      error.classList.remove('warning-animation');
    }, 500);
  },
  hide() {
    const error = document.querySelector('#login-page-warning');
    const errorText = document.querySelector('#login-page-warning-text');

    errorText.innerHTML = '';
    error.classList.add('display-none');
  }
};

window.addEventListener('load', () => {
  const ipInputEl = document.querySelector('#ip-input');
  const passwordInputEl = document.querySelector('#password-input');

  const passwordHideButtonEl = document.querySelector('#password-hide-button');
  const passwordShowButtonEl = document.querySelector('#password-show-button');

  const autocompleteListEl = document.getElementById("ip-input-autocomplete-list");
  const selectedItemEl = document.getElementById("selected-item");

  const highlightItem = x => {
    if (x.length > 1) {
      for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
      };
      focusedIndex = (focusedIndex + x.length - 2) % (x.length - 1) + 1;
      x[focusedIndex].classList.add("autocomplete-active");
    };
  };

  const showSelectedItem = (ip, icon) => {
    ipInputEl.value = ip;
    ipInputEl.setAttribute("style", "display: none;");
    selectedItemEl.setAttribute("style", "display: flex;");
    selectedItemEl.children[0].setAttribute("src", all_projects.find(item => item.project.name == icon) ? all_projects.find(item => item.project.name == icon).project.image : "assets/default.png");
    selectedItemEl.children[1].textContent = icon;
    selectedItemEl.children[2].textContent = ip;
  };

  document.addEventListener('click', event => {
    if (event.target.closest('#login-button')) {
      warning.hide();

      connectSSH({
        host: ipInputEl.value,
        password: passwordInputEl.value,
      }, (err, res) => {
        loading.hide();

        if (err) {
          warning.show(err);
          return;
        };
        
        console.log('res: ' + res);
      });
    } else if (event.target.closest('#password-hide-button')) {
      passwordInputEl.type = 'text';
      passwordHideButtonEl.classList.add('display-none');
      passwordShowButtonEl.classList.remove('display-none');
    } else if (event.target.closest('#password-show-button')) {
      passwordInputEl.type = 'password';
      passwordShowButtonEl.classList.add('display-none');
      passwordHideButtonEl.classList.remove('display-none');
    } else if (event.target.closest('#dropdown-toggle-button')) {
      ipInputEl.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      autocompleteListEl.innerHTML = "";
    };
  });

  document.addEventListener('keydown', event => {
    if (event.target.closest('#ip-input')) {
      x = document.querySelectorAll(".each-autocomplete-item");

      if (event.key == "ArrowDown") {
        focusedIndex++;
        highlightItem(x);
      }
      else if (event.key == "ArrowUp") {
        focusedIndex--;
        highlightItem(x);
      }
      else if (event.key == "Enter" && focusedIndex > -1) {
        x[focusedIndex].click();
      };
    } else if (event.target.closest('#password-input')) {
      if (event.key == "Enter") {
        document.querySelector('#login-button').click();
      };
    };
  });

  document.addEventListener('input', event => {
    if (event.target.closest('#ip-input')) {
      // autocompleteListEl.innerHTML = "";
      // focusedIndex = 0;
      // for (let i = 0; i < ipAddresses.length; i++) {
      //   if (ipAddresses[i].ip.toLowerCase().includes(ipInputEl.value.toLowerCase()) || ipAddresses[i].icon.toLowerCase().includes(ipInputEl.value.toLowerCase())) {
      //     div = document.createElement("div");
      //     div.setAttribute("class", "each-autocomplete-item");
      //     div.addEventListener("click", function () {
      //       showSelectedItem.call(this, ipAddresses[i].ip, ipAddresses[i].icon);
      //     });
      //     img = document.createElement("img");
      //     img.setAttribute("class", "each-autocomplete-item-icon");
      //     img.setAttribute("src", all_projects.find(item => item.project.name == ipAddresses[i].icon) ? all_projects.find(item => item.project.name == ipAddresses[i].icon).project.image + "?" + new Date().getTime() : "assets/default.png");
      //     div1 = document.createElement("div");
      //     div1.textContent = ipAddresses[i].icon;
      //     div2 = document.createElement("div");
      //     div2.setAttribute("class", "each-autocomplete-item-ip");
      //     div2.textContent = ipAddresses[i].ip;
      //     removebutton = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      //     removebutton.setAttribute("class", "each-autocomplete-item-close");
      //     removebutton.setAttribute("viewBox", "0 0 24 24");
      //     removebutton.setAttribute("stroke", "var(--fourth-color)");
      //     removebutton.setAttribute("stroke-width", "2");
      //     removebutton.addEventListener("click", function (e) {
      //       e.stopPropagation();
      //       this.parentElement.remove();
      //       ipAddresses.splice(ipAddresses.findIndex(item => item.ip == this.parentElement.children[2].textContent), 1);
      //       localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
      //     });
      //     path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      //     path.setAttribute("d", "M6 18L18 6M6 6l12 12");
      //     removebutton.appendChild(path);
      //     div.appendChild(img);
      //     div.appendChild(div1);
      //     div.appendChild(div2);
      //     div.appendChild(removebutton);
      //     autocompleteListEl.appendChild(div);
      //   };
      // };
    };
  });
});