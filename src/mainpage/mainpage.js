const { invoke } = window.__TAURI__.tauri;

function did_i_logged_in() {
    invoke("did_i_logged_in");
}