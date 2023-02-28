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
