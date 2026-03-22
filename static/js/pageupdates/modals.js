// modals.js
// Standalone module for all element/page modal wiring + submit handlers.
// Depends on jQuery, Bootstrap (modal events), and your API routes.
// Exports: initModals()

import { updateDisplay } from './render.js'; // your renderer rebinds buttons & refreshes DOM

// --- local utils kept here to remain standalone ---
/**
 * Get the current values on any element
 * This is to help retrieve any information we need to display in the modals, rather than relying 
 * on stuffing the information inside of the edit buttons that trigger the modals to open.
 * 
 */
async function getCurrentDataOnElement(uuid) {
    // console.log(`-------GETTING CURRENT DATA ON ELEMENT ${uuid}....`);
    try {
        const response = await fetch(`/page/${uuid}`);

        if (!response.ok) {
            throw new Error(`HTTP ERROR! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('---FETCH ERROR: ', error);
    }

}

/**
 * Decode simple HTML entities in condition strings and split into [lhs, op, rhs]
 * Examples: "apple&gt;2" -> ["apple", ">", "2"]
 */
// console.log("----modals.js");
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
    //the '/upload' route should be in server.js 
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

function getCheckboxValue(fd, fieldName) {
    const v = fd.get(fieldName);
    return v === 'on' || v === 'true' || v === '1';
}

function getMethod(fd, requestField) {
    return fd.get(requestField) === 'PUT' ? 'PUT' : 'POST';
}


function submitJsonToPageApi({
    method,
    payload,
    toastId
}) {
    $.ajax({
        url: '/page/api',
        type: method,
        data: JSON.stringify(payload),
        contentType: 'application/json; charset=UTF-8',
        processData: false,
        success: function (data) {
            console.log("----success with submitJsonToPageApi!!");
            if (toastId) $(toastId).toast?.('show');
            updateDisplay(data);
        },
        error: function (xhr, status, err) {
            console.error('AJAX error', status, err, xhr?.status, xhr?.responseText);
        },
        complete: function () {
            $('.elementModal').modal?.('hide');
        },
    });
}

function submitUrlEncoded({
    url,
    method,
    payload,
    toastId,
    onSuccess,
    onComplete,
}) {
    console.log(`---calling submitURLEncoded! ${url}, ${method}, payload:(${Object.values(payload)}`);
    $.ajax({
        url,
        type: method,
        data: payload,
        success: function (data) {
            if (toastId) $(toastId).toast?.('show');
            if (typeof onSuccess === 'function') onSuccess(data);
        },
        error: function (xhr, status, err) {
            console.error('AJAX error', status, err, xhr?.status, xhr?.responseText);
        },
        complete: function () {
            if (typeof onComplete === 'function') onComplete();
        },
    });
}

function bindConfiguredForm(config) {
    const form = document.getElementById(config.formId);
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        try {
            const fd = new FormData(form);

            // advanced form path
            if (typeof config.submit === 'function') {
                await config.submit({ fd, form, event: e, config });
                return;
            }

            const { method, payload } = config.buildPayload(fd);

            submitJsonToPageApi({
                method,
                payload,
                toastId: typeof config.toastId === 'function' ? config.toastId(method) : config.toastId,
                modalSelector: config.modalSelector || '.elementModal',
            });
        } catch (err) {
            console.error(`Error submitting to ${config.formId}:`, err);
        }
    });
}

const modalConfigs = {
    text: {
        formId: 'textFormModal',
        toastId: '#myTextToast',
        buildPayload(fd) {
            const method = getMethod(fd, 'textrequest');
            const uuid = fd.get('uuid');
            const section = fd.get('section');
            const value = (fd.get('modaltextInput') || '').toString();
            const newline = getCheckboxValue(fd, 'textnewline');

            return {
                method,
                payload:
                    method === 'POST'
                        ? { uuid, section, type: 'text', value, newline }
                        : { uuid, newDataObj: { value, newline } },
            };
        },
    },

    dynamic: {
        formId: 'dynamicFormModal',
        toastId: '#myTextToast',
        buildPayload(fd) {
            const method = getMethod(fd, 'dynamicrequest');
            const uuid = fd.get('uuid');
            const section = fd.get('section');
            const value = (fd.get('modaldynamicInput') || '').toString();
            const newline = getCheckboxValue(fd, 'dynamicnewline');

            return {
                method,
                payload:
                    method === 'POST'
                        ? { uuid, section, type: 'dynamic', value, newline }
                        : { uuid, newDataObj: { value, newline } },
            };
        },
    },

    condition: {
        formId: 'conditionFormModal',
        toastId: '#myConditionToast',
        buildPayload(fd) {
            const method = getMethod(fd, 'conditionrequest');
            const value = `${fd.get('modalconditionInput')}${fd.get('conditionComparisonModal')}${fd.get('modalconditionInput2')}`;
            const booloperator = fd.get('conditionAndOrGroup');

            return {
                method,
                payload:
                    method === 'POST'
                        ? {
                            uuid: fd.get('hiddenconditionuuid'),
                            section: fd.get('section'),
                            type: 'condition',
                            value,
                            booloperator: 'and',
                        }
                        : {
                            uuid: fd.get('hiddenconditionuuid'),
                            newDataObj: { value, booloperator },
                        },
            };
        },
    },

    page: {
        formId: 'pageFormModal',
        toastId(method) {
            return method === 'POST' ? '#myPageToast' : null;
        },
        buildPayload(fd) {
            const method = getMethod(fd, 'pagerequest');
            const value = (fd.get('modalpageInput') || '').toString();

            return {
                method,
                payload:
                    method === 'POST'
                        ? {
                            uuid: fd.get('uuid'),
                            section: fd.get('section'),
                            type: 'page',
                            value,
                        }
                        : {
                            uuid: fd.get('uuid'),
                            newDataObj: {
                                title: value,
                                value,
                            },
                        },
            };
        },
    },

    choice: {
        formId: 'choiceFormModal',
        async submit({ fd }) {
            const method = getMethod(fd, 'choicerequest');
            const uuid = fd.get('hiddenchoiceuuid');
            const storyUuid = fd.get('hiddenstoryuuid');
            const section = fd.get('section');
            const label = (fd.get('modalchoiceInput') || '').toString();
            const destination = fd.get('destinationModal');
            const newline = getCheckboxValue(fd, 'choicenewline');
            const hasEvents = getCheckboxValue(fd, 'choicedispatchevent');

            const submitChoiceToApi = (destUUID) => {
                const finalValue = `${label}||${destUUID}`;

                const payload =
                    method === 'POST'
                        ? {
                            uuid,
                            section,
                            type: 'choice',
                            value: finalValue,
                            newline,
                            hasEvents,
                        }
                        : {
                            uuid,
                            newDataObj: {
                                value: finalValue,
                                newline,
                                hasEvents,
                            },
                        };

                submitJsonToPageApi({
                    method,
                    payload,
                    toastId: '#myChoiceToast',
                    modalSelector: '.elementModal',
                });
            };

            if (destination === 'New') {
                console.log(`---creating NEW DESTINATION with story id: ${storyUuid}!!!`);
                submitUrlEncoded({
                    url: `/page/newpage/`,
                    method: 'POST',
                    payload: { uuid: storyUuid, value: label },
                    toastId: '#myPageToast',
                    onSuccess: function (data) {
                        console.log('NEW PAGE RESPONSE:', data);
                        submitChoiceToApi(data.uuid);
                    },
                });
                return;
            }

            if (destination === 'Event') {
                submitChoiceToApi('Event');
                return;
            }

            submitChoiceToApi(destination);
        },
    },

    imageUpload: {
        formId: 'uploadFormModal',
        async submit({ fd }) {
            const method = getMethod(fd, 'imagerequest');
            const imgPath = await createLocalImgUploadPath(fd);

            const html = `<img class="pageImage" src="/uploads/${imgPath}">`;

            const payload =
                method === 'POST'
                    ? {
                        uuid: fd.get('uuid'),
                        section: fd.get('section'),
                        type: 'image',
                        value: imgPath,
                        conditions: [],
                        html,
                    }
                    : {
                        uuid: fd.get('uuid'),
                        newDataObj: {
                            value: imgPath,
                            html,
                        },
                    };

            submitJsonToPageApi({
                method,
                payload,
                toastId: '#myImageToast',
                modalSelector: '.elementModal',
            });
        },
    },

    imageAI: {
        formId: 'uploadImageFormModal_AI',
        async submit({ fd }) {
            const method = getMethod(fd, 'imagerequest');
            const imgPath = fd.get('imagepath_ai');
            const html = `<img class="pageImage" src="/uploads/${imgPath}">`;

            const payload =
                method === 'POST'
                    ? {
                        uuid: fd.get('uuid'),
                        section: fd.get('section'),
                        type: 'image',
                        value: imgPath,
                        conditions: [],
                        html,
                    }
                    : {
                        uuid: fd.get('uuid'),
                        newDataObj: {
                            value: imgPath,
                            html,
                        },
                    };

            submitJsonToPageApi({
                method,
                payload,
                toastId: '#myImageToast',
                modalSelector: '.elementAiModal',
                onComplete: function () {
                    if (typeof window.aiForm_reset === 'function') window.aiForm_reset();
                },
            });
        },
    }


};

bindConfiguredForm(modalConfigs.text);
bindConfiguredForm(modalConfigs.dynamic);
bindConfiguredForm(modalConfigs.condition);
bindConfiguredForm(modalConfigs.page);

bindConfiguredForm(modalConfigs.choice);
// bindConfiguredForm(modalConfigs.imageUpload);
// bindConfiguredForm(modalConfigs.imageAI);

//eventually everything at once
//Object.values(modalConfigs).forEach(bindConfiguredForm);

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
    // code that fires when a modal is opened
    document.querySelectorAll('.elementModal').forEach((modal) => {
        modal.addEventListener('show.bs.modal', async (event) => {
            const button = event.relatedTarget;
            if (!button) return;

            let elData;

            //pull existing data from element to use for various inputs in modal display
            //want to eventually get all necessary data this way instead of using button.dataset for everything - not sustainable!
            try {
                // console.log(`------ATTEMPTING TO PULL INFO ABOUT ${button.dataset.bsElementuuid}.....`);
                elData = await getCurrentDataOnElement(button.dataset.bsElementuuid);
                console.log("---Here's some data about the element!!! ", elData);
            } catch (e) {
                console.log("----error: ", e);
            }


            const el_title = button.dataset.bsElementtitle;
            const el_type = button.dataset.bsElementtype;
            // const el_value = button.dataset.bsElementvalue;
            // const newline = button.dataset.bsNewline;
            // const el_title = elData.title;
            // const el_type = elData.type;
            const el_value = elData.value;
            const newline = elData.newline;
            const el_subtype = button.dataset.bsElementsubtype;

            const modalInput = document.getElementById(`modal${el_type}Input`);
            const modalTitle = document.getElementById(`modal${el_type}Label`);
            const modalnewlinecheckbox = document.getElementById(`${el_type}newline`);
            const uuidinput = document.getElementById(`hidden${el_type}uuid`);

            try {
                console.log("---newline? ", newline);
                modalnewlinecheckbox.checked = newline;
            } catch (e) {
                console.log("---error: No newline checkbox found");
            }



            const requestField = document.getElementById(`${el_type}request`);
            if (requestField) requestField.value = button.dataset.bsRequest || 'PUT';
            const btn_request = button.dataset.bsRequest || 'PUT';

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
                    // if (modalInput) modalInput.value = el_value || '';
                    modalInput.value = btn_request === 'POST' ? `` : el_value;
                    break;

                case 'dynamic':
                    createConditionEditLink();
                    // if (modalInput) modalInput.value = el_value || '';
                    modalInput.value = btn_request === 'POST' ? `` : el_value;
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
                    modalInput.value = label;
                    const dropdown = /** @type {HTMLSelectElement} */ (document.getElementById('choiceDestinationModal'));
                    const hiddendestination = /** @type {HTMLInputElement} */ (document.getElementById('destinationModal'));
                    const hiddenstoryuuid = /** @type {HTMLInputElement} */ (document.getElementById('hiddenstoryuuid'));
                    const evtCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('choicedispatchevent'));
                    const evtIsChecked = elData.hasEvents;

                    evtCheckbox.checked = evtIsChecked;
                    console.log(`-----------EVENT CHKBOX  ${evtCheckbox.checked} - DISPATCH EVENT ${evtIsChecked}`);
                    if (hiddenstoryuuid) hiddenstoryuuid.value = button.dataset.bsStoryuuid || '';
                    //if (modalInput) modalInput.value = label || '';

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
                    // if (modalInput) modalInput.value = el_value || '';
                    modalInput.value = btn_request === 'POST' ? `` : el_value;
                    break;

                case 'condition': {
                    console.log("----condition before parsing..", el_value);
                    const and_radio = document.querySelector('input[name="conditionAndOrGroup"]').value;
                    document.querySelector('input[name="conditionAndOrGroup"][value="or"]').checked = (elData.booloperator === "or");
                    console.log("------CONDITION AND/OR: ", elData.booloperator);
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
                    let [eType = '', p = '', o = '', v = ''] = String(el_value || '').split('_');
                    if (el_subtype) {
                        console.log("---EVENT SUBTYPE FOUND: ", el_subtype);
                        eType = el_subtype;
                        document.getElementById('modaleventType').value = el_subtype;
                        let evtMsg = document.getElementById("eventMessage");
                        if (el_subtype == "auto") {
                            evtMsg.textContent = "This event will be triggered immediately once the page loads.";
                        } else {
                            evtMsg.textContent = "This event will be triggered only from clicking this link."
                        }
                    }

                    const prop = document.getElementById('modaleventInput');
                    const oper = document.getElementById('eventComparisonModal');
                    const amt = document.getElementById('modaleventInput2');

                    if (prop) prop.value = p;
                    if (oper) oper.value = o;
                    if (amt) amt.value = v;

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


    // --- IMAGE (regular & AI) ---
    const uploadImageForm = document.getElementById('uploadFormModal');
    if (uploadImageForm) uploadImageForm.addEventListener('submit', submitImage);

    const uploadImageFormAI = document.getElementById('uploadImageFormModal_AI');
    if (uploadImageFormAI) uploadImageFormAI.addEventListener('submit', submitImage);



    // --- EVENT ---
    const eventForm = document.getElementById('eventFormModal');
    if (eventForm) {
        eventForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(eventForm);

            const uuid = formData.get('hiddeneventuuid');
            const evttype = formData.get('modaleventType');
            const property = formData.get('modaleventInput');
            const operator = formData.get('eventComparisonModal');
            const amount = formData.get('modaleventInput2');
            const value = `${evttype}_${property}_${operator}_${amount}`;

            const assembledData = {
                uuid,
                newDataObj: {
                    evttype,
                    title: "event",
                    property,
                    operator,
                    amount,
                    value,
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
                            evttype,
                            title: "",
                            property,
                            operator,
                            amount,
                            value,
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

    // --- CHOICE ---
    // const choiceForm = document.getElementById('choiceFormModal');
    // if (choiceForm) {
    //     choiceForm.addEventListener('submit', function (e) {
    //         e.preventDefault();

    //         const fd = new FormData(choiceForm);
    //         // const rawMethod = fd.get('choicerequest');
    //         const method = getMethod(fd, 'choicerequest');
    //         // const method = rawMethod === 'PUT' ? 'PUT' : 'POST';

    //         // Base fields
    //         const uuid = fd.get('hiddenchoiceuuid');      // parent uuid to attach to
    //         const storyUuid = fd.get('hiddenstoryuuid');
    //         const section = fd.get('section');            // required on POST?
    //         const label = (fd.get('modalchoiceInput') || '').toString();
    //         const destination = fd.get('destinationModal');
    //         const newline = getCheckboxValue(fd, 'choicenewline');
    //         const eventCheckbox = (() => {
    //             const z = fd.get('choicedispatchevent');
    //             return z === 'on' || z === 'true' || z === '1';
    //         })();
    //         let newElements = [];

    //         //special feature needed for event checkbox - if the box is checked, and no events currently exist
    //         //we need to create an event and push it to the elements array
    //         console.log(`--------EVENT CHECKBOX CHECKED? ${eventCheckbox}`);

    //         function createOrUpdateChoice(destUUID) {
    //             // Recompute the final "value" now that we know the true destination

    //             const finalValue = `${label}||${destUUID}`;

    //             const payload =
    //                 method === 'POST'
    //                     ? { uuid, section, type: 'choice', value: finalValue, newline, hasEvents: eventCheckbox }
    //                     : { uuid, newDataObj: { value: finalValue, newline, hasEvents: eventCheckbox } };

    //             console.log('---payload:', payload);

    //             submitJsonToPageApi({ method, payload, toastId: '#myChoiceToast' });

    //         }

    //         if (destination === 'New') {
    //             // Create the destination page first, then submit the choice with the new UUID
    //             const justLabel = label; // the "choice" label only
    //             console.log('---modal: creating new page first');
    //             console.log(`-----CHOICE DISPATCH EVENT CHECKBOX: ${eventCheckbox}`);

    //             $.ajax({
    //                 url: `/page/newpage/${storyUuid}`,
    //                 type: 'POST',
    //                 // This endpoint previously worked with urlencoded; keep it simple
    //                 data: { uuid: storyUuid, value: justLabel },
    //                 success: function (data) {
    //                     console.log('---modal: success creating new page');
    //                     $('#myPageToast').toast?.('show');
    //                     const newDest = data.newUUID;
    //                     createOrUpdateChoice(newDest);              // <-- pass real UUID
    //                 },
    //                 error: function (xhr, status, err) {
    //                     console.error('Create page error', status, err, xhr?.status, xhr?.responseText);
    //                 },
    //             });
    //         } else if (destination === 'Event') {
    //             createOrUpdateChoice('Event');
    //             console.log('---creating a choice that triggers a placeholder event');
    //         } else {
    //             // Existing page UUID chosen in the dropdown
    //             createOrUpdateChoice(destination);
    //         }
    //     });
    // }

    // --- TEXT ---
    // const textForm = document.getElementById('textFormModal');
    // if (textForm) {
    //     textForm.addEventListener('submit', function (e) {
    //         e.preventDefault();

    //         const fd = new FormData(textForm);
    //         // const rawMethod = fd.get('textrequest');
    //         const method = getMethod(fd, 'textrequest');
    //         //const method = rawMethod === 'PUT' ? 'PUT' : 'POST';

    //         // Normalize fields
    //         const uuid = fd.get('uuid');
    //         const section = fd.get('section');                // only used on POST
    //         const value = (fd.get('modaltextInput') || '').toString();
    //         const newline = getCheckboxValue(fd, 'textnewline');

    //         console.log(`----checking fields: ${uuid}, ${section}, ${value}, ${newline}`);

    //         // Build a single payload shape the server expects
    //         const payload =
    //             method === 'POST'
    //                 ? { uuid, section, type: 'text', value, newline }
    //                 : { uuid, newDataObj: { value, newline } };

    //         console.log(`----checking payload:`, payload);

    //         $.ajax({
    //             url: '/page/api',
    //             type: method,
    //             data: JSON.stringify(payload),
    //             contentType: 'application/json; charset=UTF-8',
    //             processData: false,
    //             success: function (data) {
    //                 console.log("----success with text!!");
    //                 $('#myTextToast').toast?.('show');
    //                 updateDisplay(data);
    //             },
    //             error: function (xhr, status, err) {
    //                 console.error('AJAX error', status, err, xhr?.status, xhr?.responseText);
    //             },
    //             complete: function () {
    //                 $('.elementModal').modal?.('hide');
    //             },
    //         });
    //     });
    // }

    // --- DYNAMIC ---
    // const dynamicForm = document.getElementById('dynamicFormModal');
    // if (dynamicForm) {
    //     dynamicForm.addEventListener('submit', function (e) {
    //         e.preventDefault();

    //         const fd = new FormData(dynamicForm);
    //         // const rawMethod = fd.get('dynamicrequest');
    //         const method = getMethod(fd, 'dynamicrequest');
    //         // const method = rawMethod === 'PUT' ? 'PUT' : 'POST';

    //         // Normalize fields
    //         const uuid = fd.get('uuid');
    //         const section = fd.get('section');                // only used on POST
    //         const value = (fd.get('modaldynamicInput') || '').toString();
    //         const newline = getCheckboxValue(fd, 'dynamicnewline');

    //         console.log(`----checking fields: ${uuid}, ${section}, ${value}, ${newline}`);

    //         // Build a single payload shape the server expects
    //         const payload =
    //             method === 'POST'
    //                 ? { uuid, section, type: 'dynamic', value, newline }
    //                 : { uuid, newDataObj: { value, newline } };

    //         console.log(`----checking payload (method: ${method}):`, payload);


    //         $.ajax({
    //             url: '/page/api',
    //             type: method,
    //             data: JSON.stringify(payload),
    //             contentType: 'application/json; charset=UTF-8',
    //             processData: false,
    //             success: function (data) {
    //                 console.log("----success with dynamic!!");
    //                 $('#myTextToast').toast?.('show');
    //                 updateDisplay(data);
    //             },
    //             error: function (xhr, status, err) {
    //                 console.error('AJAX error', status, err, xhr?.status, xhr?.responseText);
    //             },
    //             complete: function () {
    //                 $('.elementModal').modal?.('hide');
    //             },
    //         });
    //     });
    // }

    // --- CONDITION ---
    // const conditionForm = document.getElementById('conditionFormModal');
    // if (conditionForm) {
    //     conditionForm.addEventListener('submit', function (e) {
    //         e.preventDefault();
    //         const formData = new FormData(conditionForm);

    //         const method = formData.get('conditionrequest') === 'POST' ? 'POST' : 'PUT';
    //         const value = `${formData.get('modalconditionInput')}${formData.get('conditionComparisonModal')}${formData.get('modalconditionInput2')} `;
    //         const and_or = formData.get('conditionAndOrGroup');
    //         console.log("------SUBMIT CONDITION AND/OR: ", and_or);

    //         $.ajax({
    //             url: '/page/api',
    //             type: method,
    //             data:
    //                 method === 'POST'
    //                     ? {
    //                         uuid: formData.get('hiddenconditionuuid'),
    //                         section: formData.get('section'),
    //                         type: 'condition',
    //                         value,
    //                         booloperator: "and"
    //                     }
    //                     : {
    //                         uuid: formData.get('hiddenconditionuuid'),
    //                         newDataObj: { value, booloperator: and_or },
    //                     },
    //             success: function (data) {
    //                 $('#myConditionToast').toast?.('show');
    //                 updateDisplay(data);
    //             },
    //             complete: function () {
    //                 $('.elementModal').modal?.('hide');
    //             },
    //         });
    //     });
    // }

    // --- PAGE ---
    // const pageForm = document.getElementById('pageFormModal');
    // if (pageForm) {
    //     pageForm.addEventListener('submit', function (e) {
    //         e.preventDefault();
    //         const formData = new FormData(pageForm);
    //         const method = formData.get('pagerequest') === 'POST' ? 'POST' : 'PUT';

    //         $.ajax({
    //             url: '/page/api',
    //             type: method,
    //             data:
    //                 method === 'POST'
    //                     ? {
    //                         uuid: formData.get('uuid'),
    //                         section: formData.get('section'),
    //                         type: 'page',
    //                         value: formData.get('modalpageInput'),
    //                     }
    //                     : {
    //                         uuid: formData.get('uuid'),
    //                         newDataObj: {
    //                             title: formData.get('modalpageInput'),
    //                             value: formData.get('modalpageInput'),
    //                         },
    //                     },
    //             success: function (data) {
    //                 if (method === 'POST') $('#myPageToast').toast?.('show');
    //                 updateDisplay(data);
    //             },
    //             complete: function () {
    //                 $('.elementModal').modal?.('hide');
    //             },
    //         });
    //     });
    // }
}
