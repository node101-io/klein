const showLoadingAnimation = () => {
    scrollto = window.scrollY;
    document.querySelector(".all-wrapper").setAttribute("style", "pointer-events: none; display: none;");
    document.querySelector(".boxes").setAttribute("style", "display: unset;");
}
const hideLoadingAnimation = () => {
    document.querySelector(".boxes").setAttribute("style", "display: none;");
    document.querySelector(".all-wrapper").setAttribute("style", "pointer-events: unset; display: unset;");
    if (typeof scrollto !== "undefined") { window.scrollTo(0, scrollto) };
}