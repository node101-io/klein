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






document.getElementById('validator-operations').addEventListener('click', function() {
    toggleVisibilityOfValidatorOpeation()
});
document.getElementsByClassName('wallet-address'.addEventListener('click', function () {
    copyWalletAddress()
}))
document.getElementsByClassName('fa-solid fa-copy'.addEventListener('click', function () {
    copyWalletAddress()
}))

