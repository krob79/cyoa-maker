import { initModals } from './modals.js';
import { initDragDrop } from './dragdrop.js';
import { initializeDeleteButtons, initializeDeleteButtonFromModal } from './deleteHandlers.js';

console.log("------NEW MAIN.JS!!");

document.addEventListener('DOMContentLoaded', () => {
    initDragDrop();
    //initModals();
    initializeDeleteButtons();
    initializeDeleteButtonFromModal();
});