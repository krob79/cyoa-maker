// dragdrop.js
import { reorderElements } from './render.js';

// console.log("----dragdrop.js");

export function initDragDrop() {
    const el = document.getElementById('draggableList');
    if (!el) {
        console.log('---no sortable objects found');
        return;
    }

    try {
        new Sortable(el, {
            swapThreshold: 0.75,
            ghostClass: 'ghost',
            animation: 150,
            handle: '.drag-handle',
            onEnd: (evt) => {
                reorderElements({ from: evt.oldIndex, to: evt.newIndex });
                // console.log(`From: ${evt.oldIndex} to ${evt.newIndex}`);
            },
        });
    } catch (err) {
        console.error('Sortable init failed', err);
    }
}

