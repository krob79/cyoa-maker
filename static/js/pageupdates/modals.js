// modals.js
// Standalone module for all element/page modal wiring + submit handlers.
// Depends on jQuery, Bootstrap (modal events), and your API routes.
// Exports: initModals()

import { updateDisplay } from './render.js'; // your renderer rebinds buttons & refreshes DOM

// --- local utils kept here to remain standalone ---

/**
 * Decode simple HTML entities in condition strings and split into [lhs, op, rhs]
 * Examples: "apple&gt;2" -> ["apple", ">", "2"]
 */
console.log("----modals.js");
function parseConditionString(str = '') {
    const normalized = String(str)
        .replace(/&gt;/gi, '>')
        .replace(/&lt;/gi, '<')
        .replace(/&amp;/gi, '&')
        .replace(/&equals;/gi, '=');

    const m = /([A-Za-z0-9]+)\s*([<>=])\s*([A-Za-z0-9]+)/.exec(normalized);
    return m ? [m[1], m[2], m[3]] : ['', '=', ''];
}

/**
 * Create a local copy of a selected image and return its path (server responds with JSON)
 */
async function createLocalImgUploadPath(formData) {
    const res = await fetch('/upload', { method: 'POST', body: formData });
    if (!res.ok) {
        const err = await res.text();
        console.error('Upload Failed', err);
        throw new Error('Upload failed');
    }
    const imgPath = await res.json();
    return imgPath;
}

/**
 * Shared submit handler for image modals (regular + AI)
 */
async function submitImage(e) {
    e.preventDefault();
    const formEl = /** @type {HTMLFormElement} */ (document.getElementById(e.target.id));
    if (!formEl) return;

    const formData = new FormData(formEl);
    let imgPath;

    // FIRST FETCH REQUEST (only for local file uploads)
    if (e.target.id === 'uploadFormModal') {
        imgPath = await createLocalImgUploadPath(formData);
    } else if (e.target.id === 'uploadImageFormModal_AI') {
        imgPath = formData.get('imagepath_ai');
    }

    const assembledData = {
        uuid: formData.get('uuid'),
        newDataObj: {
            value: imgPath,
            html: `<img class="pageImage" src="/uploads/${imgPath}">`,
        },
    };

    const method = formData.get('imagerequest') === 'POST' ? 'POST' : 'PUT';

    $.ajax({
        url: '/page/api',
        type: method,
        data:
            method === 'POST'
                ? {
                    uuid: formData.get('uuid'),
                    section: formData.get('section'),
                    type: 'image',
                    value: imgPath,
                    conditions: [],
                    html: `<img class="pageImage" src="/uploads/${imgPath}">`,
                }
                : { ...assembledData },
        success: function (data) {
            $('#myImageToast').toast?.('show');
            updateDisplay(data);
        },
        complete: function () {
            if (e.target.id === 'uploadFormModal') {
                $('.elementModal').modal?.('hide');
            } else if (e.target.id === 'uploadImageFormModal_AI') {
                // this helper exists in your app; call only if present
                if (typeof window.aiForm_reset === 'function') window.aiForm_reset();
                $('.elementAiModal').modal?.('hide');
            }
        },
    });
}

/**
 * Wire up all modal open/close events and form submissions.
 */
export function initModals() {
    // --- AI image modal prefill ---
    document.querySelectorAll('.elementAiModal').forEach((modal) => {
        modal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            if (!button) return;
            const uuidinput = document.getElementById('hiddenAiImageuuid');
            if (uuidinput) uuidinput.value = button.dataset.bsElementuuid || '';
        });
    });

    // --- Element modals (text/image/choice/page/condition/event) ---
    document.querySelectorAll('.elementModal').forEach((modal) => {
        modal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            if (!button) return;

            const el_title = button.dataset.bsElementtitle;
            const el_type = button.dataset.bsElementtype;
            const el_value = button.dataset.bsElementvalue;
            const modalInput = document.getElementById(`modal${el_type}Input`);
            const modalTitle = document.getElementById(`modal${el_type}Label`);

            const requestField = document.getElementById(`${el_type}request`);
            if (requestField) requestField.value = button.dataset.bsRequest || 'PUT';
            const btn_request = button.dataset.bsRequest || 'PUT';

            const uuidinput = document.getElementById(`hidden${el_type}uuid`);
            if (uuidinput) uuidinput.value = button.dataset.bsElementuuid || '';

            // helper for the "Set Conditions" link
            function createConditionEditLink() {
                const conditionsLink = document.getElementById(`modal${el_type}Conditions`);
                if (conditionsLink && uuidinput?.value && btn_request == 'PUT') {
                    conditionsLink.style.display = "block";
                    conditionsLink.setAttribute('href', `/page/${uuidinput.value}/edit`);
                    conditionsLink.textContent = `Set Conditions for this ${el_type} >`;
                } else {
                    conditionsLink.style.display = "none";
                }
            }

            switch (el_type) {
                case 'text':
                    createConditionEditLink();
                    if (modalInput) modalInput.value = el_value || '';
                    break;

                case 'image': {
                    createConditionEditLink();
                    const imgPreview = /** @type {HTMLImageElement} */ (document.getElementById('previewModal'));
                    if (imgPreview) {
                        if (btn_request === 'PUT') {
                            imgPreview.src = `/uploads/${el_value}`;
                            imgPreview.style.display = 'block';
                        } else {
                            imgPreview.style.display = 'none';
                        }
                    }
                    break;
                }

                case 'choice': {
                    createConditionEditLink();
                    const [label, dest] = String(el_value || '').split('||');
                    const dropdown = /** @type {HTMLSelectElement} */ (document.getElementById('choiceDestinationModal'));
                    const hiddendestination = /** @type {HTMLInputElement} */ (document.getElementById('destinationModal'));
                    const hiddenstoryuuid = /** @type {HTMLInputElement} */ (document.getElementById('hiddenstoryuuid'));
                    if (hiddenstoryuuid) hiddenstoryuuid.value = button.dataset.bsStoryuuid || '';
                    if (modalInput) modalInput.value = label || '';
                    if (!dest) {
                        if (dropdown) dropdown.value = 'New';
                        if (hiddendestination) hiddendestination.value = 'New';
                    } else {
                        if (dropdown) dropdown.value = dest;
                        if (hiddendestination) hiddendestination.value = dest;
                    }
                    break;
                }

                case 'page':
                    if (modalInput) modalInput.value = el_value || '';
                    break;

                case 'condition': {
                    const [lhs, op, rhs] = parseConditionString(el_value);
                    const a = document.getElementById('modalconditionInput');
                    const o = document.getElementById('conditionComparisonModal');
                    const b = document.getElementById('modalconditionInput2');
                    if (a) a.value = lhs;
                    if (o) o.value = op;
                    if (b) b.value = rhs;
                    break;
                }

                case 'event': {
                    createConditionEditLink();
                    const [eType = '', p = '', o = '', v = ''] = String(el_value || '').split('_');
                    const label = document.getElementById('modaleventInputLabel');
                    const prop = document.getElementById('modaleventInput');
                    const oper = document.getElementById('eventComparisonModal');
                    const amt = document.getElementById('modaleventInput2');
                    if (label) label.value = el_title;
                    if (prop) prop.value = p;
                    if (oper) oper.value = o;
                    if (amt) amt.value = v;

                    const radios = /** @type {NodeListOf<HTMLInputElement>} */ (
                        document.getElementsByName('eventType')
                    );
                    radios?.forEach((r) => {
                        r.checked = r.value === eType;
                    });
                    break;
                }
            }

            if (modalTitle) {
                modalTitle.textContent = btn_request === 'POST' ? `Create new ${el_type}` : `Edit ${el_type}`;
            }
        });

        // Placeholder for any per-modal teardown if needed later
        modal.addEventListener('hidden.bs.modal', () => { });
    });

    // Clear bootstrap remote cache when hidden (jQuery style used in your code)
    $('.elementModal').on?.('hidden.bs.modal', function () {
        $(this).removeData('bs.modal');
    });
    $('.elementAiModal').on?.('hidden.bs.modal', function () {
        $(this).removeData('bs.modal');
    });

    // --- TEXT ---
    const textForm = document.getElementById('textFormModal');
    if (textForm) {
        textForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(textForm);
            const method = formData.get('textrequest') === 'POST' ? 'POST' : 'PUT';

            $.ajax({
                url: '/page/api',
                type: method,
                data:
                    method === 'POST'
                        ? {
                            uuid: formData.get('uuid'),
                            section: formData.get('section'),
                            type: 'text',
                            value: formData.get('modaltextInput'),
                            html: `<p class="pageText">${formData.get('modaltextInput')}</p>`,
                        }
                        : {
                            uuid: formData.get('uuid'),
                            newDataObj: {
                                value: formData.get('modaltextInput'),
                                html: `<p class="pageText">${formData.get('modaltextInput')}</p>`,
                            },
                        },
                success: function (data) {
                    $('#myTextToast').toast?.('show');
                    updateDisplay(data);
                },
                complete: function () {
                    $('.elementModal').modal?.('hide');
                },
            });
        });
    }

    // --- IMAGE (regular & AI) ---
    const uploadImageForm = document.getElementById('uploadFormModal');
    if (uploadImageForm) uploadImageForm.addEventListener('submit', submitImage);

    const uploadImageFormAI = document.getElementById('uploadImageFormModal_AI');
    if (uploadImageFormAI) uploadImageFormAI.addEventListener('submit', submitImage);

    // --- CHOICE ---
    const choiceForm = document.getElementById('choiceFormModal');
    if (choiceForm) {
        choiceForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(choiceForm);

            function runSecondRequest(destUUID) {
                const method = formData.get('choicerequest') === 'POST' ? 'POST' : 'PUT';
                const payload =
                    method === 'POST'
                        ? {
                            uuid: formData.get('hiddenchoiceuuid'),
                            section: formData.get('section'),
                            type: 'choice',
                            value: `${formData.get('modalchoiceInput')}||${destUUID}`,
                            html: `<a class="pageLink" href="/page/${destUUID}/edit">${formData.get('modalchoiceInput')}</a>`,
                        }
                        : {
                            uuid: formData.get('hiddenchoiceuuid'),
                            newDataObj: {
                                value: `${formData.get('modalchoiceInput')}||${destUUID}`,
                                html: `<a class="pageLink" href="/page/${destUUID}/edit">${formData.get('modalchoiceInput')}</a>`,
                            },
                        };

                $.ajax({
                    url: '/page/api',
                    type: method,
                    data: payload,
                    success: function (data) {
                        $('#myChoiceToast').toast?.('show');
                        updateDisplay(data);
                    },
                    complete: function () {
                        $('.elementModal').modal?.('hide');
                    },
                });
            }

            // If creating a new destination page first:
            if (formData.get('destinationModal') === 'New') {
                $.ajax({
                    url: `/page/newpage/${formData.get('hiddenstoryuuid')}`,
                    type: 'POST',
                    data: {
                        uuid: formData.get('hiddenstoryuuid'),
                        value: formData.get('modalchoiceInput'),
                    },
                    success: function (data) {
                        $('#myPageToast').toast?.('show');
                        const newDest = data.newUUID;
                        runSecondRequest(newDest);
                    },
                });
            } else {
                runSecondRequest(formData.get('destinationModal'));
            }
        });
    }

    // --- EVENT ---
    const eventForm = document.getElementById('eventFormModal');
    if (eventForm) {
        eventForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(eventForm);

            const assembledData = {
                uuid: formData.get('hiddeneventuuid'),
                newDataObj: {
                    occurs: formData.get('eventType'),
                    title: formData.get('modaleventInputLabel'),
                    property: formData.get('modaleventInput'),
                    operator: formData.get('eventComparisonModal'),
                    amount: formData.get('modaleventInput2'),
                    value: `${formData.get('eventType')}_${formData.get('modaleventInput')}_${formData.get('eventComparisonModal')}_${formData.get('modaleventInput2')}`,
                    html: `<strong>  Custom ${formData.get('eventType')} event: ${formData.get('modaleventInput')}${formData.get('eventComparisonModal')}${formData.get('modaleventInput2')} </strong>`,
                },
            };

            const method = formData.get('eventrequest') === 'POST' ? 'POST' : 'PUT';

            $.ajax({
                url: '/page/api',
                type: method,
                data:
                    method === 'POST'
                        ? {
                            uuid: formData.get('hiddeneventuuid'),
                            section: formData.get('section'),
                            type: 'event',
                            occurs: formData.get('eventType'),
                            title: formData.get('modaleventInputLabel'),
                            property: formData.get('modaleventInput'),
                            operator: formData.get('eventComparisonModal'),
                            amount: formData.get('modaleventInput2'),
                            value: assembledData.newDataObj.value,
                            html: assembledData.newDataObj.html,
                        }
                        : { ...assembledData },
                success: function (data) {
                    $('#myChoiceToast').toast?.('show');
                    updateDisplay(data);
                },
                complete: function () {
                    $('.elementModal').modal?.('hide');
                },
            });
        });
    }

    // --- CONDITION ---
    const conditionForm = document.getElementById('conditionFormModal');
    if (conditionForm) {
        conditionForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(conditionForm);

            const method = formData.get('conditionrequest') === 'POST' ? 'POST' : 'PUT';
            const value = `${formData.get('modalconditionInput')}${formData.get('conditionComparisonModal')}${formData.get('modalconditionInput2')}`;

            $.ajax({
                url: '/page/api',
                type: method,
                data:
                    method === 'POST'
                        ? {
                            uuid: formData.get('hiddenconditionuuid'),
                            section: formData.get('section'),
                            type: 'condition',
                            value,
                        }
                        : {
                            uuid: formData.get('hiddenconditionuuid'),
                            newDataObj: { value },
                        },
                success: function (data) {
                    $('#myConditionToast').toast?.('show');
                    updateDisplay(data);
                },
                complete: function () {
                    $('.elementModal').modal?.('hide');
                },
            });
        });
    }

    // --- PAGE ---
    const pageForm = document.getElementById('pageFormModal');
    if (pageForm) {
        pageForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(pageForm);
            const method = formData.get('pagerequest') === 'POST' ? 'POST' : 'PUT';

            $.ajax({
                url: '/page/api',
                type: method,
                data:
                    method === 'POST'
                        ? {
                            uuid: formData.get('uuid'),
                            section: formData.get('section'),
                            type: 'page',
                            value: formData.get('modalpageInput'),
                        }
                        : {
                            uuid: formData.get('uuid'),
                            newDataObj: {
                                title: formData.get('modalpageInput'),
                                value: formData.get('modalpageInput'),
                            },
                        },
                success: function (data) {
                    if (method === 'POST') $('#myPageToast').toast?.('show');
                    updateDisplay(data);
                },
                complete: function () {
                    $('.elementModal').modal?.('hide');
                },
            });
        });
    }
}
