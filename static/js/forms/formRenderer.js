// formRenderer.js

//choose an element from elementSchemas, and reference the form from wherever (document.getELementById(formID))
export function renderFields(schema, form) {
    form.innerHTML = ""; // clear
    schema.forEach(f => {
        const group = document.createElement("div");
        group.className = "mb-3";

        //make a label
        if (f.type !== "hidden" && f.type !== "checkbox" && f.label) {
            const label = document.createElement("label");
            label.className = "form-label";
            label.textContent = f.label;
            label.htmlFor = f.name;
            group.appendChild(label);
        }

        //make an input field and pull in any attributes from the schema
        const input = f.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
        input.className = "form-control";
        input.name = f.name;
        input.type = f.type === "textarea" ? undefined : f.type;
        if (f.accept) input.accept = f.accept;
        if (f.required) input.required = true;
        if (f.min != null) input.min = f.min;
        if (f.max != null) input.max = f.max;
        if (f.step != null) input.step = f.step;
        if (f.value != null) input.value = f.value;
        if (f.type === "checkbox") {
            input.className = "form-check-input";
            group.innerHTML = ""; // use Bootstrap checkbox layout
            const div = document.createElement("div");
            div.className = "form-check";
            const label = document.createElement("label");
            label.className = "form-check-label";
            label.textContent = f.label;
            label.htmlFor = f.name;
            div.appendChild(input);
            div.appendChild(label);
            group.appendChild(div);
        } else {
            group.appendChild(input);
        }
        form.appendChild(group);
    });
}
