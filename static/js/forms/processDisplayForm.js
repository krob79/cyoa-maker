export async function processDisplayForm(formEl, displayId) {
    // 1) Build a JS object from the form (no files yet)
    const payload = formToObject(formEl);   // see util below
    payload.elements ||= [];                // ensure arrays exist

    // 2) If there are files, upload first
    const fileInput = formEl.querySelector('input[type="file"]');
    if (fileInput && fileInput.files.length > 0) {
        const fd = new FormData();
        // Support multiple files if needed:
        [...fileInput.files].forEach(f => fd.append("files", f));
        const uploadRes = await fetch("/uploads", { method: "POST", body: fd });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { files } = await uploadRes.json(); // [{path, originalName, mime, size}]
        // Put the returned local path(s) into payload
        payload.src = files[0].path; // or push into payload.elements, etc.
    }

    // 3) Send JSON PUT
    const res = await fetch(`/displays/${displayId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Save failed");
    return await res.json();
}
