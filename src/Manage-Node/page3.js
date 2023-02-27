// Functions
function toggleVisibilityOfValidatorOpeation() {
let subButtons = document.getElementById("sub-buttons");
if (subButtons.style.display === "none") {
    subButtons.style.display = "block";
} else {
    subButtons.style.display = "none";
}
}
function copyWalletAddress() {
var button = document.getElementsByClassName("wallet-address");
var text = button.innerHTML;

navigator.clipboard
    .writeText(text)
    .then(function () {
    console.log("Text copied to clipboard");
    })
    .catch(function (err) {
    console.error("Error copying text: ", err);
    });
}