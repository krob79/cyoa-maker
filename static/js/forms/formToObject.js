export function formToObject(form) {
    const obj = {};
    const data = new FormData(form);
    for (const [key, val] of data.entries()) {
        // Skip file inputs here; handled separately
        const el = form.elements[key];
        if (el?.type === "file") continue;

        //this may be something you need to manually add in the attributes of the input fields
        /* Examples:
            <input name="fontSize" data-type="number">
            <input name="targetBlank" type="checkbox" data-type="bool">
            <input name="tags" data-type="array">       
        */
        const hint = el?.dataset?.type; // optional
        let v = val;

        if (hint === "number") v = val === "" ? null : Number(val);
        else if (hint === "bool") v = el.type === "checkbox" ? el.checked : val === "true";
        else if (hint === "json") v = val ? JSON.parse(val) : null;
        else if (hint === "array") {
            // collect repeated keys into an array
            if (!obj[key]) obj[key] = [];
            obj[key].push(val);
            continue;
        } else {
            // checkboxes without hint
            if (el?.type === "checkbox") v = el.checked;
        }

        // assign (merge dotted paths like meta.count if you use them)
        setDeep(obj, key, v);
    }

    // Ensure empty structures for known keys
    if (obj.elements == null) obj.elements = [];
    return obj;
}

// helper to set nested keys like "meta.count"
function setDeep(target, path, value) {
    if (!path.includes(".")) { target[path] = value; return; }
    const parts = path.split(".");
    let cur = target;
    for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] ||= {};
        cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
}
