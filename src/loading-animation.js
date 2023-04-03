function showLoadingAnimation() {
    scrollto = window.scrollY;
    document.querySelector(".all-wrapper").style.setProperty("pointer-events", "none");
    document.querySelector(".all-wrapper").style.setProperty("display", "none");
    document.querySelector(".boxes").style.setProperty("display", "unset");
}
function hideLoadingAnimation() {
    document.querySelector(".boxes").style.setProperty("display", "none");
    document.querySelector(".all-wrapper").style.removeProperty("display");
    document.querySelector(".all-wrapper").style.removeProperty("pointer-events");
    window.scrollTo(0, scrollto);
}