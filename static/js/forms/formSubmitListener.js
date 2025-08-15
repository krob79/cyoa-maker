document.addEventListener("submit", async (e) => {
    const form = e.target.closest("form[data-display-form]");
    if (!form) return;
    e.preventDefault();
    const displayId = form.dataset.displayId;
    try {
        const result = await processDisplayForm(form, displayId);
        // update UI, close modal, toast, etc.
    } catch (err) {
        console.error(err);
        // show error toast
    }
});