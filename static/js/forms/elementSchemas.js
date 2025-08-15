export const elementSchemas = {
    text: [
        { name: "type", type: "hidden", value: "text" },
        { name: "content", label: "Text", type: "textarea", required: true },
        { name: "fontSize", label: "Font Size", type: "number", min: 8, max: 96, step: 1 },
        { name: "classes", label: "CSS Classes", type: "text" }
    ],
    image: [
        { name: "type", type: "hidden", value: "image" },
        { name: "alt", label: "Alt Text", type: "text", required: true },
        { name: "file", label: "Image File", type: "file", accept: "image/*", required: true },
        { name: "caption", label: "Caption", type: "text" }
    ],
    link: [
        { name: "type", type: "hidden", value: "link" },
        { name: "href", label: "URL", type: "url", required: true },
        { name: "label", label: "Label", type: "text", required: true },
        { name: "targetBlank", label: "Open in new tab", type: "checkbox" }
    ]
};