// elementSchemas.js
// A tiny DSL for forms that maps closely to Bootstrap classes you already use.

export const elementSchemas = {
    page: {
        id: "pageFormModal",
        className: "row g-3",
        hidden: [
            { id: "hiddenpageuuid", name: "uuid", value: "<%=uuid %>" },
            { id: "section", name: "section", value: "elements" },
            { id: "pagerequest", name: "pagerequest", value: "" }
        ],
        fields: [
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        size: "12",
                        children: [
                            { type: "label", for: "modalpageInput", text: "Page Title:" },
                            {
                                type: "textarea",
                                id: "modalpageInput",
                                name: "modalpageInput",
                                className: "form-control",
                                placeholder: "Enter a title for the page."
                            }
                        ]
                    }
                ]
            }
        ],
        footer: [
            { type: "button", className: "btn btn-secondary", attrs: { "data-bs-dismiss": "modal", type: "button" }, text: "Cancel" },
            { type: "button", className: "btn btn-primary", attrs: { type: "submit" }, text: "Update" }
        ]
    },

    text: {
        id: "textFormModal",
        className: "row g-3",
        hidden: [
            { id: "hiddentextuuid", name: "uuid", value: "" },
            { id: "section", name: "section", value: "elements" },
            { id: "textrequest", name: "textrequest", value: "" }
        ],
        fields: [
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        size: "12",
                        children: [
                            { type: "label", for: "modaltextInput", text: "Text:" },
                            {
                                type: "textarea",
                                id: "modaltextInput",
                                name: "modaltextInput",
                                className: "form-control",
                                placeholder: "Enter your text"
                            },
                            { type: "a", id: "modaltextConditions", href: "", text: "Review Conditions For This Text >" }
                        ]
                    }
                ]
            }
        ],
        footer: [
            { type: "button", className: "btn btn-secondary", attrs: { "data-bs-dismiss": "modal", type: "button" }, text: "Cancel" },
            { type: "button", className: "btn btn-primary", attrs: { type: "submit" }, text: "Update" }
        ]
    },

    image: {
        id: "uploadFormModal",
        className: "",
        hidden: [
            { id: "hiddenimageuuid", name: "uuid", value: "" },
            { name: "section", value: "elements" },
            { id: "imagerequest", name: "imagerequest", value: "" }
        ],
        fields: [
            { type: "a", id: "modalimageConditions", href: "", text: "Review Conditions For This Text >" },
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        size: "12",
                        children: [
                            {
                                type: "img",
                                id: "previewModal",
                                attrs: { name: "previewModal", alt: "Image preview", style: "max-width: 100%; display: none; margin-top: 10px;" }
                            }
                        ]
                    }
                ]
            },
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        size: "12",
                        children: [
                            {
                                type: "group",
                                children: [
                                    {
                                        type: "input",
                                        inputType: "file",
                                        className: "form-control",
                                        id: "modalimageInput",
                                        name: "file",
                                        attrs: { accept: "image/*", "aria-describedby": "inputGroupFileAddon04", "aria-label": "Upload" }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        children: [
                            // Your "+ AI image" trigger button (stays as-is)
                            {
                                type: "button",
                                className: "btn btn-secondary newElement",
                                html: `+<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-image" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z"/></svg>`,
                                attrs: {
                                    type: "button",
                                    "data-bs-toggle": "modal",
                                    "data-bs-request": "POST",
                                    "data-bs-elementtype": "image",
                                    "data-bs-elementuuid": "<%=pageData.uuid %>",
                                    "data-bs-elementvalue": "",
                                    "data-bs-target": "#aiimageUpdateModal"
                                }
                            }
                        ]
                    },
                    {
                        type: "col",
                        className: "modal-footer",
                        children: [
                            { type: "button", className: "btn btn-secondary", attrs: { "data-bs-dismiss": "modal", type: "button" }, text: "Cancel" },
                            { type: "button", className: "btn btn-primary", attrs: { type: "submit", id: "inputGroupFileAddon04" }, text: "Upload Image" }
                        ]
                    }
                ]
            }
        ]
    },

    aiImage: {
        id: "uploadImageFormModal_AI",
        className: "",
        hidden: [
            { id: "hiddenAiImageuuid", name: "uuid", value: "" },
            { name: "section", value: "elements" },
            { id: "imagerequest_ai", name: "imagerequest", value: "POST" },
            { id: "imagepath_ai", name: "imagepath_ai", value: "" }
        ],
        fields: [
            { type: "img", id: "aipreviewModal_ai", attrs: { name: "aipreviewModal", alt: "Image preview", style: "max-width: 100%; display: none; margin-top: 10px;" } },
            {
                type: "div",
                id: "aiModalSpinner",
                className: "text-center",
                attrs: { style: "display:none;" },
                html: `<div class="spinner-border" role="status"><span class="visually-hidden"></span></div>`
            },
            {
                type: "div",
                className: "form-floating mb-3",
                children: [
                    {
                        type: "textarea",
                        id: "modalimagePrompt",
                        className: "form-control",
                        placeholder: "Add your prompt here",
                        attrs: { style: "max-width: 100%; display: block; margin-top: 10px;" }
                    },
                    { type: "p", text: `Ex: "Generate an image of a cowboy riding a dinosaur"` },
                    { type: "button", id: "aiImagePreviewBtn", className: "btn btn-info", attrs: { type: "button" }, text: "Generate Preview" }
                ]
            }
        ],
        footer: [
            { type: "button", id: "ai_modal_cancel", className: "btn btn-secondary", attrs: { "data-bs-dismiss": "modal", type: "button" }, text: "Cancel" },
            {
                type: "button",
                id: "ai_image_submit",
                className: "btn btn-success",
                attrs: { type: "submit" },
                html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path class="submit" d="m424-296 282-282-56-56-226 226-114-114-56 56zm56 216q-83 0-156-31.5T197-197t-85.5-127T80-480t31.5-156T197-763t127-85.5T480-880t156 31.5T763-763t85.5 127T880-480t-31.5 156T763-197t-127 85.5T480-80m0-80q134 0 227-93t93-227-93-227-227-93-227 93-93 227 93 227 227 93m0-320"/></svg>Yes, Use This!`
            },
            {
                type: "button",
                id: "ai_image_cancel",
                className: "btn btn-danger",
                attrs: { "data-bs-dismiss": "modal", type: "button" },
                html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><style>path.cancel,path.submit{fill:white;padding:0px;}</style><path class="cancel" d="m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144zM480-80q-83 0-156-31.5T197-197t-85.5-127T80-480t31.5-156T197-763t127-85.5T480-880t156 31.5T763-763t85.5 127T880-480t-31.5 156T763-197t-127 85.5T480-80m0-80q134 0 227-93t93-227-93-227-227-93-227 93-93 227 93 227 227 93m0-320" stroke="white"/></svg>Nevermind...`
            }
        ]
    },

    choice: {
        id: "choiceFormModal",
        className: "row g-3 mb-3",
        hidden: [
            { name: "hiddenstoryuuid", id: "hiddenstoryuuid", value: "<%=uuid %>" },
            { name: "hiddenchoiceuuid", id: "hiddenchoiceuuid", value: "<%=uuid %>" },
            { name: "section", value: "elements" },
            { id: "destinationModal", name: "destinationModal", value: "New" },
            { id: "choicerequest", name: "choicerequest", value: "" }
        ],
        fields: [
            { type: "row", children: [] },
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        size: "12",
                        className: "input-group",
                        children: [
                            { type: "span", className: "input-group-text", attrs: { id: "basic-addon3" }, text: "Link Label:" },
                            { type: "input", inputType: "text", className: "form-control", name: "modalchoiceInput", id: "modalchoiceInput", attrs: { "aria-describedby": "basic-addon3 basic-addon4" } }
                        ]
                    },
                    {
                        type: "col",
                        className: "input-group",
                        children: [
                            { type: "label", className: "input-group-text", attrs: { for: "inputGroupSelect01" }, text: "Link to Page:" },
                            {
                                type: "select",
                                className: "form-select",
                                id: "choiceDestinationModal",
                                // You said you'll supply options elsewhere; put a placeholder now:
                                options: [
                                    { value: "New", label: "Create New Page", selected: true }
                                    // append server-rendered options after render if needed
                                ],
                                attrs: { onchange: "changeChoiceDestinationModal()" }
                            }
                        ]
                    },
                    { type: "div", className: "valid-feedback", text: "Looks good!" }
                ]
            },
            {
                type: "row",
                children: [
                    { type: "col", children: [{ type: "a", id: "modalchoiceConditions", href: "", text: "Review Conditions For This Choice >" }] },
                    {
                        type: "col",
                        className: "modal-footer",
                        children: [
                            { type: "button", className: "btn btn-secondary", attrs: { "data-bs-dismiss": "modal", type: "button" }, text: "Cancel" },
                            { type: "button", className: "btn btn-primary", attrs: { type: "submit" }, text: "Update" }
                        ]
                    }
                ]
            }
        ]
    },

    condition: {
        id: "conditionFormModal",
        className: "row g-3 mb-3",
        hidden: [
            { name: "hiddenconditionuuid", id: "hiddenconditionuuid", value: "<%=uuid %>" },
            { name: "section", value: "elements" },
            { id: "comparisonModal", name: "comparisonModal", value: "" },
            { id: "conditionrequest", name: "conditionrequest", value: "" }
        ],
        fields: [
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        size: "12",
                        children: [
                            {
                                type: "group",
                                children: [
                                    { type: "span", className: "input-group-text", attrs: { id: "basic-addon3" }, text: "Property Name:" },
                                    { type: "input", inputType: "text", className: "form-control", name: "modalConditionProperty", id: "modalConditionProperty", attrs: { "aria-describedby": "basic-addon3 basic-addon4" } }
                                ]
                            },
                            { type: "div", className: "valid-feedback", text: "Looks good!" }
                        ]
                    }
                ]
            },
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        size: "12",
                        children: [
                            { type: "label", className: "input-group-text", attrs: { for: "inputGroupSelect01" }, text: "Comparison:" },
                            {
                                type: "select",
                                className: "form-select",
                                id: "modalConditionOperator",
                                name: "modalConditionOperator",
                                options: [
                                    { value: "<", label: "<" },
                                    { value: "=", label: "=" },
                                    { value: ">", label: ">" }
                                ],
                                attrs: { onchange: "changemodalConditionOperator()" }
                            }
                        ]
                    },
                    {
                        type: "col",
                        size: "12",
                        children: [
                            {
                                type: "group",
                                children: [
                                    { type: "span", className: "input-group-text", attrs: { id: "basic-addon4" }, text: "Value:" },
                                    { type: "input", inputType: "text", className: "form-control", name: "modalConditionAmount", id: "modalConditionAmount", attrs: { "aria-describedby": "basic-addon3 basic-addon4" } }
                                ]
                            }
                        ]
                    },
                    {
                        type: "col",
                        size: "12",
                        className: "modal-footer",
                        children: [
                            { type: "button", className: "btn btn-secondary", attrs: { "data-bs-dismiss": "modal", type: "button" }, text: "Cancel" },
                            { type: "button", className: "btn btn-primary", attrs: { type: "submit" }, text: "Update" }
                        ]
                    }
                ]
            }
        ]
    },

    event: {
        id: "eventFormModal",
        className: "row g-3 mb-3",
        hidden: [
            { name: "hiddeneventuuid", id: "hiddeneventuuid", value: "<%=uuid %>" },
            { name: "section", value: "elements" },
            { id: "comparisonModal", name: "comparisonModal", value: "" },
            { id: "eventrequest", name: "eventrequest", value: "" }
        ],
        fields: [
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        children: [
                            { type: "text", text: "When Page Loads, This Event Should Be Triggered:" },
                            {
                                type: "div",
                                className: "form-check form-check-inline",
                                children: [
                                    { type: "input", inputType: "radio", className: "form-check-input", name: "eventType", id: "eventType1", attrs: { value: "auto" } },
                                    { type: "label", className: "form-check-label", attrs: { for: "eventType1" }, text: "Immediately" }
                                ]
                            },
                            {
                                type: "div",
                                className: "form-check form-check-inline",
                                children: [
                                    { type: "input", inputType: "radio", className: "form-check-input", name: "eventType", id: "eventType2", attrs: { value: "user" } },
                                    { type: "label", className: "form-check-label", attrs: { for: "eventType2" }, text: "From User Action" }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        children: [
                            {
                                type: "group",
                                children: [
                                    { type: "span", className: "input-group-text", attrs: { id: "basic-addon3" }, text: "Label:" },
                                    { type: "input", inputType: "text", className: "form-control", name: "modaleventInputLabel", id: "modaleventInputLabel", attrs: { value: "New Event", "aria-describedby": "basic-addon3 basic-addon4" } }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                type: "row",
                className: "justify-content-center",
                children: [
                    {
                        type: "col",
                        children: [
                            {
                                type: "group",
                                children: [
                                    { type: "span", className: "input-group-text", attrs: { id: "basic-addon3" }, text: "Property Name:" },
                                    { type: "input", inputType: "text", className: "form-control", name: "modaleventInput", id: "modaleventInput", attrs: { "aria-describedby": "basic-addon3 basic-addon4" } }
                                ]
                            },
                            { type: "div", className: "valid-feedback", text: "Looks good!" }
                        ]
                    },
                    {
                        type: "col",
                        children: [
                            {
                                type: "group",
                                children: [
                                    { type: "label", className: "input-group-text", attrs: { for: "inputGroupSelect01" }, text: "Change:" },
                                    {
                                        type: "select",
                                        className: "form-select",
                                        id: "eventComparisonModal",
                                        name: "eventComparisonModal",
                                        options: [
                                            { value: "-", label: "decrease value by" },
                                            { value: "=", label: "set value equal to" },
                                            { value: "+", label: "increase value by" }
                                        ],
                                        attrs: { onchange: "changeeventComparisonModal()" }
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: "col",
                        children: [
                            {
                                type: "group",
                                children: [
                                    { type: "span", className: "input-group-text", attrs: { id: "basic-addon4" }, text: "Value:" },
                                    { type: "input", inputType: "text", className: "form-control", name: "modaleventInput2", id: "modaleventInput2", attrs: { "aria-describedby": "basic-addon3 basic-addon4" } }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                type: "row",
                children: [
                    {
                        type: "col",
                        size: "12",
                        children: [
                            { type: "a", id: "modaleventConditions", href: "", text: "Review Conditions For This Event >" },
                            {
                                type: "div",
                                className: "modal-footer",
                                children: [
                                    { type: "button", className: "btn btn-secondary", attrs: { "data-bs-dismiss": "modal", type: "button" }, text: "Cancel" },
                                    { type: "button", className: "btn btn-primary", attrs: { type: "submit" }, text: "Update" }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
};
