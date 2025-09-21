import { findUuidInURL } from '/js/pageupdates/utils.js'

export function pageModeToggle() {
    let currentURL = window.location.href;
    let split = currentURL.split('/');
    let mode = split[split.length - 2];
    let result = findUuidInURL();
    console.log("----MODE? ", mode, " - ", result);
    let newmode = (mode == 'edit' ? 'view' : 'edit');
    window.location.href = `/page/${result}/${newmode}/`;
}

const link = document.getElementById("navModeLink");
link?.addEventListener('click', pageModeToggle);