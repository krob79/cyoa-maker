// formRenderer.js
// Minimal renderer for the schema format above.
// Focus: clean Bootstrap markup, no validation/dynamic logic.

export function renderForm(schema, mountEl) {
    // Make a <form> root
    const form = document.createElement("form");
    if (schema.id) form.id = schema.id;
    form.className = schema.className || "";
    form.setAttribute("novalidate", ""); // keep your current pattern

    // Hidden fields
    (schema.hidden || []).forEach(h => {
        const input = document.createElement("input");
        input.type = "hidden";
        if (h.id) input.id = h.id;
        if (h.name) input.name = h.name;
        if (h.value != null) input.value = h.value;
        form.appendChild(input);
    });

    // Fields
    (schema.fields || []).forEach(node => {
        form.appendChild(build(node));
    });

    // Footer
    if (schema.footer?.length) {
        const footer = document.createElement("div");
        footer.className = "modal-footer";
        for (const btn of schema.footer) {
            footer.appendChild(build(btn));
        }
        form.appendChild(footer);
    }

    // Inject into mount
    mountEl.innerHTML = "";
    mountEl.appendChild(form);
    return form; // return the form element for wiring submit handlers
}

// --- Builders ---

function build(node) {
    if (!node) return document.createComment("empty");

    // Simple text-only nodes
    if (node.type === "text") {
        const span = document.createElement("span");
        if (node.className) span.className = node.className;
        if (node.text) span.textContent = node.text;
        return span;
    }

    if (node.type === "span") {
        const el = document.createElement("span");
        if (node.className) el.className = node.className;
        applyAttrs(el, node.attrs);
        if (node.text) el.textContent = node.text;
        return el;
    }

    if (node.type === "p") {
        const el = document.createElement("p");
        if (node.className) el.className = node.className;
        if (node.text) el.textContent = node.text;
        return el;
    }

    if (node.type === "a") {
        const a = document.createElement("a");
        if (node.id) a.id = node.id;
        if (node.className) a.className = node.className;
        a.href = node.href || "#";
        if (node.text) a.textContent = node.text;
        applyAttrs(a, node.attrs);
        return a;
    }

    if (node.type === "img") {
        const img = document.createElement("img");
        if (node.id) img.id = node.id;
        if (node.className) img.className = node.className;
        applyAttrs(img, node.attrs);
        if (node.src) img.src = node.src;
        if (node.alt) img.alt = node.alt;
        return img;
    }

    if (node.type === "label") {
        const label = document.createElement("label");
        label.className = node.className || "form-label";
        if (node.for) label.htmlFor = node.for;
        if (node.text) label.textContent = node.text;
        return label;
    }

    if (node.type === "input") {
        const input = document.createElement("input");
        input.type = node.inputType || "text";
        if (node.id) input.id = node.id;
        if (node.name) input.name = node.name;
        input.className = node.className || "form-control";
        if (node.placeholder) input.placeholder = node.placeholder;
        if (node.value != null) input.value = node.value;
        applyAttrs(input, node.attrs);
        return input;
    }

    if (node.type === "textarea") {
        const ta = document.createElement("textarea");
        if (node.id) ta.id = node.id;
        if (node.name) ta.name = node.name;
        ta.className = node.className || "form-control";
        if (node.placeholder) ta.placeholder = node.placeholder;
        if (node.rows) ta.rows = node.rows;
        if (node.value != null) ta.value = node.value;
        applyAttrs(ta, node.attrs);
        return ta;
    }

    if (node.type === "select") {
        const sel = document.createElement("select");
        if (node.id) sel.id = node.id;
        if (node.name) sel.name = node.name;
        sel.className = node.className || "form-select";
        (node.options || []).forEach(opt => {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label ?? String(opt.value);
            if (opt.selected) o.selected = true;
            sel.appendChild(o);
        });
        applyAttrs(sel, node.attrs);
        return sel;
    }

    if (node.type === "button") {
        const btn = document.createElement("button");
        if (node.id) btn.id = node.id;
        btn.className = node.className || "btn";
        if (node.text) btn.textContent = node.text;
        if (node.html) btn.innerHTML = node.html; // allow SVG
        applyAttrs(btn, node.attrs);
        return btn;
    }

    if (node.type === "group") {
        const wrap = document.createElement("div");
        wrap.className = node.className || "input-group";
        (node.children || []).forEach(ch => wrap.appendChild(build(ch)));
        return wrap;
    }

    if (node.type === "div") {
        const div = document.createElement("div");
        if (node.id) div.id = node.id;
        if (node.className) div.className = node.className;
        applyAttrs(div, node.attrs);
        if (node.text) div.textContent = node.text;
        if (node.html) div.innerHTML = node.html;
        (node.children || []).forEach(ch => div.appendChild(build(ch)));
        return div;
    }

    if (node.type === "row") {
        const row = document.createElement("div");
        row.className = "row" + (node.className ? ` ${node.className}` : "");
        (node.children || []).forEach(ch => row.appendChild(build(ch)));
        return row;
    }

    if (node.type === "col") {
        const col = document.createElement("div");
        const size = node.size ? ` col-md-${node.size}` : " col";
        col.className = (node.className ? `${node.className}${size.includes("col") ? "" : size}` : `col${size !== " col" ? size : ""}`).trim();
        (node.children || []).forEach(ch => col.appendChild(build(ch)));
        return col;
    }

    // Fallback: empty comment node to avoid crashes
    return document.createComment(`unknown node type: ${node.type}`);
}

function applyAttrs(el, attrs) {
    if (!attrs) return;
    Object.entries(attrs).forEach(([k, v]) => {
        if (v === true) el.setAttribute(k, "");        // boolean attributes
        else if (v === false || v == null) return;     // skip
        else el.setAttribute(k, String(v));
    });
}
