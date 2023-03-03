// Functions
function toggleVisibilityOfValidatorOpeation() {
    let subButtons = document.getElementById("subbuttons-ul");

    style = window.getComputedStyle(subButtons)
    visibility = style.getPropertyValue("display")

    if (visibility === "none") {
        subButtons.style.display = "block";
    } else {
        subButtons.style.display = "none";
    }
}
function copyWalletAddress() {
    let button = document.getElementsByClassName("wallet-address");
    console.log(button)
    navigator.clipboard
        .writeText(button[0].innerText)
        .then(function () {
        console.log("Text copied to clipboard");
        })
        .catch(function (err) {
        console.error("Error copying text: ", err);
        });
}
function setNewStyleForDeleteButton() {
    let deleteButton = document.getElementsByClassName('node-delete-button')[0];
    let deleteButtonIcon = document.getElementsByClassName('delete-icon')[0];
    console.log(deleteButton);
    console.log(deleteButtonIcon);
    deleteButton.style.color = "white";
    deleteButton.style.background = "red";
    deleteButtonIcon.style.color = "white";
}
function setOldStyleForDeleteButton() {
    let deleteButton = document.getElementsByClassName('node-delete-button')[0];
    let deleteButtonIcon = document.getElementsByClassName('delete-icon')[0];
    console.log(deleteButton);
    console.log(deleteButtonIcon);
    deleteButton.style.color = "red";
    deleteButton.style.background = "transparent";
    deleteButtonIcon.style.color = "red";
}

function openCreateValidatorPage() {
    let content = document.getElementById('content-of-page');
    fetch('Validator-Operations/createValidator.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading file:', error);
    });
}
function openEditValidatorPage() {
    let content = document.getElementById('content-of-page');
    fetch('Validator-Operations/editValidator.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading file:', error);
    });
}
function openDelegateTokenPage() {
    let content = document.getElementById('content-of-page');
    fetch('Validator-Operations/delegateToken.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading file:', error);
    });
}
function openWithdrawRewardsPage() {
    let content = document.getElementById('content-of-page');
    fetch('Validator-Operations/withdrawRewards.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading file:', error);
    });
}
function openRedelegateTokenPage() {
    let content = document.getElementById('content-of-page');
    fetch('Validator-Operations/redelegateToken.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading file:', error);
    });
}
function openVotePage() {
    let content = document.getElementById('content-of-page');
    fetch('Validator-Operations/vote.html')
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading file:', error);
    });
}

document.getElementById('validator-operations').addEventListener('click', function() {
    toggleVisibilityOfValidatorOpeation()
})
document.getElementsByClassName('wallet-address')[0].addEventListener('click', function () {
    copyWalletAddress()
})
document.getElementsByClassName('fa-solid fa-copy')[0].addEventListener('click', function () {
    copyWalletAddress()
})
document.getElementsByClassName('node-delete-button')[0].addEventListener('mouseover', function () {
    setNewStyleForDeleteButton()
})
document.getElementsByClassName('node-delete-button')[0].addEventListener('mouseout', function () {
    setOldStyleForDeleteButton()
})
document.getElementById('create').addEventListener('click', function() {
    openCreateValidatorPage()
})
document.getElementById('edit').addEventListener('click', function() {
    openEditValidatorPage()
})
document.getElementById('delegate').addEventListener('click', function() {
    openDelegateTokenPage()
})
document.getElementById('withdraw').addEventListener('click', function() {
    openWithdrawRewardsPage()
})
document.getElementById('redelegate').addEventListener('click', function() {
    openRedelegateTokenPage()
})
document.getElementById('vote').addEventListener('click', function() {
    openVotePage()
})