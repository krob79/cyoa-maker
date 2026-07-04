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
    console.log("----createLocalImgUploadPath");
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
        console.log("attempting to crete Img Upload Path...");
        imgPath = await createLocalImgUploadPath(formData);
    } else if (e.target.id === 'uploadImageFormModal_AI') {
        imgPath = formData.get('imagepath_ai');
    } else {
        console.log("---none of this image shit is working");
    }
    console.log("---We're done with creating an image!");

    const assembledData = {
        uuid: formData.get('uuid'),
        newDataObj: {
            value: imgPath
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
                    elements: []
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

function getCheckboxValue(fieldId) {
    const el = document.getElementById(fieldId);
    //console.log("-----CHECKBOX VALUE: " + (v === 'on' || v === 'true' || v === '1'));
    return el.checked;
}

function getMethod(fd, requestField) {
    //console.log("---GET METHOD: " + requestField);
    return fd.get(requestField) === 'PUT' ? 'PUT' : 'POST';
}

function setValue(modal, selector, value) {
    //console.log(`---ATTEMPTING TO SET VALUE - ${selector} - ${value}`);
    //try {
    const el = modal.querySelector(selector);
    //console.log(`---SET VALUE - ${el.type} - ${el.name}`);
    if (el) el.value = value ?? '';
    //console.log(`---SETTING VALUE of ${selector} to ${value}... ${el.value}`);
    //} catch (e) {
    //console.log("---error using setValue function");
    //}
}

function getValue(modal, selector) {
    //console.log(`---ATTEMPTING TO GET VALUE - ${selector}`)
    const el = modal.querySelector(selector);
    //console.log(`---SET VALUE - ${el.type} - ${el.name}`);
    if (el) {
        return el.value;
    } else {
        return '';
    }
    //console.log(`---SETTING VALUE of ${selector} to ${value}... ${el.value}`);
}

function setAttribute(modal, selector, attr, value) {
    const el = modal.querySelector(selector);
    if (el) el.setAttribute(attr, value ?? '');
    console.log(`---SETTING ATTRIBUTE of ${selector} ${attr}... ${value}`);
}

function setChecked(modal, selector, checked) {
    const el = modal.querySelector(selector);
    if (el) el.checked = !!checked;
}

function setText(modal, selector, value) {
    const el = modal.querySelector(selector);
    if (el) el.textContent = value ?? '';
}

function showEl(modal, selector) {
    const el = modal.querySelector(selector);
    if (el) el.style.display = '';
}

function hideEl(modal, selector) {
    const el = modal.querySelector(selector);
    if (el) el.style.display = 'none';
}

function getTriggerData(event) {
    //console.log("---getting trigger data");
    return event.relatedTarget?.dataset || {};
}

// helper for the "Set Conditions" link
function createConditionEditLink(data) {
    //console.log(`---createConditionEditLink! ${data.type}`);
    const conditionsLink = document.getElementById(`modal${data.type}Conditions`);
    const uuidinput = document.getElementById(`hidden${data.type}uuid`);

    if (data.request == 'PUT') {
        conditionsLink.style.display = "block";
        conditionsLink.setAttribute('href', `/page/${data.uuid}/edit`);
        conditionsLink.textContent = `Set Conditions for this ${data.type} >`;
    } else {
        console.log("----THIS IS A POST NOT A PUT!! NO CONDITIONS EXIST YET");
        conditionsLink.style.display = "none";
    }
}


function submitJsonToPageApi({
    method,
    payload,
    toastId,
    modalSelector,
}) {
    //console.log("----WHATS COMING IN TO SUBMIT JSON....");
    //console.log(method, payload, toastId, modalSelector);
    $.ajax({
        url: '/page/api',
        type: method,
        data: JSON.stringify(payload),
        contentType: 'application/json; charset=UTF-8',
        processData: false,
        success: function (data) {
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
    const modal = document.getElementById(config.modalId);
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

            const { method, payload } = config.buildPayload(fd, modal);

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

async function bindConfiguredModalOpen(config) {
    console.log(`---bindConfiguredModalOpen() GETTING CONFIG: ${config.modalId}`);
    const modal = document.getElementById(config.modalId);
    if (!modal) return;

    modal.addEventListener('show.bs.modal', async function (event) {
        //console.log("----MODAL OPEN");
        const buttondata = getTriggerData(event);
        let data;
        console.log(`----Getting UUID from button:`);
        console.log(buttondata);
        try {
            // console.log(`------ATTEMPTING TO PULL INFO ABOUT ${button.dataset.bsElementuuid}.....`);
            //if this is existing content (PUT, not POST), then using the data object as-is will be fine
            //but if the request is POST, nothing exists yet, including the type, meaning thr
            //createConditionEditLink function will pull in the incorrect data
            data = await getCurrentDataOnElement(buttondata.bsElementuuid);
            data['request'] = buttondata.bsRequest;
            data['storyUuid'] = buttondata.bsStoryuuid;
            data['subType'] = buttondata.bsElementsubtype || '';
            data['section'] = 'elements'; //eventually, should we do away with this? all sections will be 'elements'?
            console.log("---from bindConfiguredModalOpen - Here's some data about the element!!! ", data);
            createConditionEditLink(data);
        } catch (e) {
            console.log("----error: ", e);
        }

        if (typeof config.onBeforeOpen === 'function') {
            config.onBeforeOpen({ modal, event, data, config });
        }

        if (typeof config.reset === 'function') {
            config.reset({ modal, event, data, config });
        }

        if (typeof config.prefill === 'function') {
            config.prefill({ modal, event, data, config });
        }

        if (typeof config.onAfterOpen === 'function') {
            config.onAfterOpen({ modal, event, data, config });
        }
    });

    if (typeof config.onHidden === 'function') {
        modal.addEventListener('hidden.bs.modal', function (event) {
            config.onHidden({ modal, event, config });
        });
    }
}

//for testing new modal open eventlistener code without completely commenting out the old code
const USE_NEW_MODAL_OPEN = {
    text: true,
    choice: true,
    dynamic: true,
    event: true,
    imageUpload: true,
    page: true,
    condition: true,
};

//config object for modal open - determining if "new" or "edit", what types of data to display, etc
const modalOpenConfigs = {
    imageUpload: {
        modalId: 'imageUpdateModal',
        formId: 'uploadFormModal',
        toastId: '#myImageToast',

        reset({ modal, data }) {
            //console.log("---RESET FOR TEXT");
            setValue(modal, '[name="hiddenimageuuid"]', data.uuid);
            setValue(modal, '[name="section"]', '');
            setValue(modal, '[name="modalimageInput"]', '');
            setValue(modal, '[name="imagerequest"]', 'POST');
        },

        prefill({ modal, data }) {
            console.log(`---PREFILL FOR TEXT - ${data.request}`);
            const isEdit = data.request === 'PUT';
            const imgPreview = document.getElementById("previewModal");
            console.log(`----FROM IMAGE PREFILL - WHAT IS DATA UUID? ${data.uuid}`);
            setValue(modal, '[name="hiddenimageuuid"]', data.uuid);
            console.log("---something went wrong with image upload");
            setValue(modal, '[name="section"]', data.section);


            if (isEdit) {
                imgPreview.src = `/uploads/${data.value}`;
                imgPreview.style.display = "block";
                setValue(modal, '[name="modalimageInput"]', data.value);
                setValue(modal, '[name="imagerequest"]', 'PUT');
            } else {
                imgPreview.src = ``;
                imgPreview.style.display = "none";
                try {
                    setValue(modal, '[name="modalimageInput"]', '');
                } catch (e) {
                    console.log("---something went wrong with image upload");
                }

                setValue(modal, '[name="imagerequest"]', 'POST');
            }
        },

        buildPayload(fd) {
            const method = getMethod(fd, 'imagerequest');
            const uuid = fd.get('hiddenimageuuid');
            const section = fd.get('section');
            const value = (fd.get('modalimageInput') || '').toString();

            return {
                method,
                payload:
                    method === 'POST'
                        ? { uuid, section, type: 'text', value, newline }
                        : { uuid, newDataObj: { value, newline } },
            };
        },
    },
    text: {
        modalId: 'textUpdateModal',
        formId: 'textFormModal',
        toastId: '#myTextToast',

        reset({ modal, data }) {
            //console.log("---RESET FOR TEXT");
            setValue(modal, '[name="uuid"]', '');
            setValue(modal, '[name="section"]', '');
            setValue(modal, '[name="modaltextInput"]', '');
            setChecked(modal, '[name="textnewline"]', false);
            setValue(modal, '[name="textrequest"]', 'POST');
        },

        prefill({ modal, data }) {
            console.log(`---PREFILL FOR TEXT - ${data.request}`);
            const isEdit = data.request === 'PUT';

            setValue(modal, '[name="uuid"]', data.uuid);
            setValue(modal, '[name="section"]', data.section);


            if (isEdit) {
                setValue(modal, '[name="modaltextInput"]', data.value);
                setChecked(modal, '[name="textnewline"]', data.newline === true);
                setValue(modal, '[name="textrequest"]', 'PUT');
            } else {
                setValue(modal, '[name="textrequest"]', 'POST');
            }
        },

        buildPayload(fd) {
            const method = getMethod(fd, 'textrequest');
            const uuid = fd.get('uuid');
            const section = fd.get('section');
            const value = (fd.get('modaltextInput') || '').toString();
            const newline = getCheckboxValue('textnewline');

            return {
                method,
                payload:
                    method === 'POST'
                        ? { uuid, section, type: 'text', value, newline }
                        : { uuid, newDataObj: { value, newline } },
            };
        },
    },
    page: {
        modalId: 'pageUpdateModal',
        formId: 'pageFormModal',
        toastId: '#myPageToast',

        reset({ modal, data }) {
            //console.log("---RESET FOR PAGE");
            setValue(modal, '[name="uuid"]', '');
            setValue(modal, '[name="section"]', '');
            setValue(modal, '[name="modalpageInput"]', '');
            setValue(modal, '[name="pagerequest"]', 'POST');
        },

        prefill({ modal, data }) {
            console.log(`---PREFILL FOR PAGE - ${data.request}`);
            const isEdit = data.request === 'PUT';

            setValue(modal, '[name="uuid"]', data.uuid);
            setValue(modal, '[name="section"]', data.section);


            if (isEdit) {
                setValue(modal, '[name="modalpageInput"]', data.value);
                setValue(modal, '[name="pagerequest"]', 'PUT');
            } else {
                setValue(modal, '[name="pagerequest"]', 'POST');
            }
        },

        buildPayload(fd) {
            const method = getMethod(fd, 'pagerequest');
            const uuid = fd.get('uuid');
            const section = fd.get('section');
            const value = (fd.get('modalpageInput') || '').toString();

            return {
                method,
                payload:
                    method === 'POST'
                        ? { uuid, section, type: 'page', value }
                        : { uuid, newDataObj: { value } },
            };
        },
    },
    dynamic: {
        modalId: 'dynamicUpdateModal',
        formId: 'dynamicFormModal',
        toastId: '#myTextToast',

        reset({ modal }) {
            setValue(modal, '[name="uuid"]', '');
            setValue(modal, '[name="section"]', '');
            setValue(modal, '[name="modaldynamicInput"]', '');
            setChecked(modal, '[name="dynamicnewline"]', false);
            setValue(modal, '[name="dynamicrequest"]', 'POST');
        },

        prefill({ modal, data }) {
            const isEdit = data.request === 'PUT';

            setValue(modal, '[name="uuid"]', data.uuid);
            setValue(modal, '[name="section"]', data.section);

            if (isEdit) {
                setValue(modal, '[name="modaldynamicInput"]', data.value);
                setChecked(modal, '[name="dynamicnewline"]', data.newline);
                setValue(modal, '[name="dynamicrequest"]', 'PUT');
            } else {
                setValue(modal, '[name="dynamicrequest"]', 'POST');
            }
        },

        buildPayload(fd) {
            const method = getMethod(fd, 'dynamicrequest');
            const uuid = fd.get('uuid');
            const section = fd.get('section');
            const value = (fd.get('modaldynamicInput') || '').toString();
            const newline = eventDisplayEvent(fd, 'dynamicnewline');

            return {
                method,
                payload:
                    method === 'POST'
                        ? { uuid, section, type: 'dynamic', value, newline }
                        : { uuid, newDataObj: { value, newline } },
            };
        },
    },
    choice: {
        modalId: 'choiceUpdateModal',
        dropdown: 'choiceDestinationModal',
        formId: 'choiceFormModal',

        reset({ modal, data }) {
            setValue(modal, '[name="hiddenchoiceuuid"]', '');
            setValue(modal, '[name="hiddenstoryuuid"]', '');
            setValue(modal, '[name="section"]', '');
            setValue(modal, '[name="modalchoiceInput"]', '');
            setValue(modal, '[name="destinationModal"]', '');
            setValue(modal, '[name="choicedestinationModal"]', "New");
            setChecked(modal, '[name="choicenewline"]', false);
            setChecked(modal, '[name="choicedispatchevent"]', false);
            setValue(modal, '[name="choicerequest"]', 'POST');
        },

        prefill({ modal, data }) {
            const isEdit = data.request === 'PUT';

            setValue(modal, '[name="hiddenchoiceuuid"]', data.uuid);
            setValue(modal, '[name="hiddenstoryuuid"]', data.storyUuid);
            setValue(modal, '[name="section"]', data.section);

            if (!isEdit) {
                setValue(modal, '[name="choicerequest"]', 'POST');
                return;
            }

            const rawValue = data.value || '';
            const [label, destination] = rawValue.split('||');
            //console.log(`---choice raw value: ${rawValue} - destination: ${destination}`);

            setValue(modal, '[name="modalchoiceInput"]', label || '');
            setValue(modal, '[name="destinationModal"]', destination || '');
            setValue(modal, '[id="choiceDestinationModal"]', destination || '');
            setChecked(modal, '[name="choicenewline"]', data.newline);
            setChecked(modal, '[name="choicedispatchevent"]', data.hasEvents);
            setValue(modal, '[name="choicerequest"]', 'PUT');
        },

        async submit({ fd }) {
            const method = getMethod(fd, 'choicerequest');
            const uuid = fd.get('hiddenchoiceuuid');
            const storyUuid = fd.get('hiddenstoryuuid');
            const section = fd.get('section');
            const label = (fd.get('modalchoiceInput') || '').toString();
            const destination = fd.get('destinationModal') || "New";
            const newline = getCheckboxValue('choicenewline');
            const hasEvents = getCheckboxValue('choicedispatchevent');

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
            console.log(`----DESTINATION? ${destination}`);
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
    event: {
        modalId: 'eventUpdateModal',
        dropdown: 'eventDestinationModal',
        formId: 'eventFormModal',
        toastId: '#myEventToast',

        reset({ modal, data }) {
            //console.log("---reset for event");
            setValue(modal, '[name="hiddeneventuuid"]', '');
            setValue(modal, '[name="modalEventType"]', data.subType);
            setValue(modal, '[name="section"]', '');
            setValue(modal, '[name="comparisonModal"]', '');
            setValue(modal, '[name="eventRequest"]', '');
            setValue(modal, '[name="eventProperty"]', '');
            setValue(modal, '[name="eventOperator"]', '');
            setValue(modal, '[name="eventAmount"]', '');
            setChecked(modal, '[name="eventDisplayEvent"]', false);
        },

        prefill({ modal, data }) {
            //console.log("---prefill");
            const isEdit = data.request === 'PUT';

            setValue(modal, '[name="hiddeneventuuid"]', data.uuid);
            setValue(modal, '[name="modalEventType"]', data.subType);
            setValue(modal, '[name="section"]', data.section);

            if (!isEdit) {
                setValue(modal, '[name="eventRequest"]', 'POST');
                return;
            } else {
                setValue(modal, '[name="eventRequest"]', 'PUT');
            }


            setValue(modal, '[name="eventProperty"]', data.property);
            setValue(modal, '[name="eventOperator"]', data.operator);
            setValue(modal, '[name="eventAmount"]', data.amount);
            setChecked(modal, '[name="eventDisplayEvent"]', data.displayevent);



        },

        buildPayload(fd, data) {
            console.log("----building payload");
            const method = getMethod(fd, 'eventRequest');
            const subtype = getValue(fd, 'modalEventType');
            const property = getValue(fd, 'eventProperty');
            const operator = getValue(fd, 'eventOperator');
            const amount = getValue(fd, 'eventAmount');
            const value = `${subtype}_${property}_${operator}_${amount}`;
            console.log(`HERE'S WHAT'S COMING: ${value}`);
            const displayevent = getCheckboxValue('eventDisplayEvent');

            return {
                method,
                payload:
                    method === 'POST'
                        ? {
                            uuid: fd.get('hiddeneventuuid'),
                            section: fd.get('section'),
                            type: 'event',
                            subtype,
                            property,
                            operator,
                            amount,
                            value,
                            displayevent,
                        }
                        : {
                            uuid: fd.get('hiddeneventuuid'),
                            newDataObj: { subtype, property, operator, amount, value, displayevent },
                        },
            };
        },


    },
    condition: {
        modalId: 'conditionUpdateModal',
        dropdown: 'conditionDestinationModal',
        formId: 'conditionFormModal',
        toastId: '#myconditionToast',

        reset({ modal, data }) {
            //console.log("---reset for condition");
            setValue(modal, '[name="hiddenconditionuuid"]', '');
            setValue(modal, '[name="section"]', '');
            setValue(modal, '[name="comparisonModal"]', '');
            setValue(modal, '[name="conditionRequest"]', '');
            setValue(modal, '[name="modalConditionProperty"]', '');
            setValue(modal, '[name="modalConditionOperator"]', '');
            setValue(modal, '[name="modalConditionAmount"]', '');
            setChecked(modal, '[name="booloperator"]', false);
        },

        prefill({ modal, data }) {
            console.log(`---prefill for condition - ${data.request}`);
            const isEdit = data.request === 'PUT';

            setValue(modal, '[name="hiddenconditionuuid"]', data.uuid);
            setValue(modal, '[name="section"]', data.section);

            if (!isEdit) {
                setValue(modal, '[name="conditionRequest"]', 'POST');
                return;
            } else {
                console.log("---we are editing the condition!");
                setValue(modal, '[name="conditionRequest"]', 'PUT');
            }


            setValue(modal, '[name="modalConditionProperty"]', data.property);
            setValue(modal, '[name="modalConditionOperator"]', data.operator);
            setValue(modal, '[name="modalConditionAmount"]', data.amount);
            setChecked(modal, '[name="booloperator"]', data.booloperator == "or");


        },

        buildPayload(fd, data) {
            console.log("----BUILDING CONDITION PAYLOAD");
            const method = getMethod(fd, 'conditionRequest');
            const subtype = getValue(modal, 'modalconditionType');
            const property = getValue(modal, 'modalConditionProperty');
            const operator = getValue(modal, 'conditionOperator');
            const amount = getValue(modal, 'conditionAmount');
            const value = `${subtype}_${property}_${operator}_${amount}`;
            console.log(`HERE'S WHAT'S COMING: ${value}`);

            return {
                method,
                payload:
                    method === 'POST'
                        ? {
                            uuid: fd.get('hiddenConditionuuid'),
                            section: fd.get('section'),
                            type: 'event',
                            value,
                        }
                        : {
                            uuid: fd.get('hiddenConditiontuuid'),
                            newDataObj: { value, operator },
                        },
            };
        },


    },
}

//config object for constructing payload and form submission
const modalConfigs = {
    text: {
        formId: 'textFormModal',
        toastId: '#myTextToast',
        buildPayload(fd, modal) {
            const method = getMethod(fd, 'textrequest');
            const uuid = fd.get('uuid');
            const section = fd.get('section');
            const value = (fd.get('modaltextInput') || '').toString();
            const newline = getCheckboxValue('textnewline');

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
            const newline = getCheckboxValue('dynamicnewline');

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
            const method = getMethod(fd, 'conditionRequest');
            const property = fd.get('modalConditionProperty');
            const operator = fd.get('modalConditionOperator');
            const amount = fd.get('modalConditionAmount');
            const value = `${fd.get('modalConditionProperty')}${fd.get('modalConditionOperator')}${fd.get('modalConditionAmount')}`;
            const booloperator = fd.get('booloperator') ?? "and";

            return {
                method,
                payload:
                    method === 'POST'
                        ? {
                            uuid: fd.get('hiddenconditionuuid'),
                            section: fd.get('section'),
                            type: 'condition',
                            property,
                            operator,
                            amount,
                            value,
                            booloperator,
                        }
                        : {
                            uuid: fd.get('hiddenconditionuuid'),
                            newDataObj: {
                                property,
                                operator,
                                amount,
                                value,
                                booloperator
                            },
                        },
            };
        },
    },

    event: {
        formId: 'eventFormModal',
        toastId: '#myEventToast',
        buildPayload(fd, modal) {
            const method = fd.get('eventRequest');
            const subtype = fd.get('modalEventType');
            const property = fd.get('eventProperty');
            const operator = fd.get('eventOperator');
            const amount = fd.get('eventAmount');
            const value = `${subtype}_${property}_${operator}_${amount}`;

            const displayevent = getCheckboxValue('eventDisplayEvent');

            return {
                method,
                payload:
                    method === 'POST'
                        ? {
                            uuid: fd.get('hiddeneventuuid'),
                            section: fd.get('section'),
                            type: 'event',
                            property,
                            operator,
                            amount,
                            value,
                            displayevent
                        }
                        : {
                            uuid: fd.get('hiddeneventuuid'),
                            newDataObj: { property, operator, amount, value, displayevent },
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
            const destination = fd.get('destinationModal') || "New";
            const newline = getCheckboxValue('choicenewline');
            const hasEvents = getCheckboxValue('choicedispatchevent');

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
            console.log(`----DESTINATION? ${destination}`);
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
                        uuid: fd.get('hiddenimageuuid'),
                        section: fd.get('section'),
                        type: 'image',
                        value: imgPath
                    }
                    : {
                        uuid: fd.get('hiddenimageuuid'),
                        newDataObj: {
                            value: imgPath,
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
if (USE_NEW_MODAL_OPEN.text) {
    bindConfiguredModalOpen(modalOpenConfigs.text);
}

bindConfiguredForm(modalConfigs.dynamic);
if (USE_NEW_MODAL_OPEN.dynamic) {
    bindConfiguredModalOpen(modalOpenConfigs.dynamic);
}

bindConfiguredForm(modalConfigs.event);
if (USE_NEW_MODAL_OPEN.event) {
    bindConfiguredModalOpen(modalOpenConfigs.event);
}

bindConfiguredForm(modalConfigs.choice);
if (USE_NEW_MODAL_OPEN.choice) {
    bindConfiguredModalOpen(modalOpenConfigs.choice);
}

bindConfiguredForm(modalConfigs.condition);
if (USE_NEW_MODAL_OPEN.condition) {
    bindConfiguredModalOpen(modalOpenConfigs.condition);
}

bindConfiguredForm(modalConfigs.page);
if (USE_NEW_MODAL_OPEN.page) {
    bindConfiguredModalOpen(modalOpenConfigs.page);
}

bindConfiguredForm(modalConfigs.imageUpload);
if (USE_NEW_MODAL_OPEN.imageUpload) {
    bindConfiguredModalOpen(modalOpenConfigs.imageUpload);
}
//bindConfiguredForm(modalConfigs.imageAI); // API has run out of credits

//eventually everything at once
//Object.values(modalConfigs).forEach(bindConfiguredForm);

/**
 * Wire up all modal open/close events and form submissions.
 */

export function initModals() {
    // --- AI image modal prefill ---
    /*
    document.querySelectorAll('.elementAiModal').forEach((modal) => {
        modal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            if (!button) return;
            const uuidinput = document.getElementById('hiddenAiImageuuid');
            if (uuidinput) uuidinput.value = button.dataset.bsElementuuid || '';
        });
    });
    */



    // --- Element modals (text/image/choice/page/condition/event) ---
    // code that fires when a modal is opened
    /*
    document.querySelectorAll('.elementModal').forEach((modal) => {
        modal.addEventListener('show.bs.modal', async (event) => {
            const button = event.relatedTarget;

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
            //const el_value = button.dataset.bsElementvalue;
            //const newline = button.dataset.bsNewline;
            //const el_type = button.dataset.bsElementtype;
            //const el_title = elData.title;
            const el_type = elData.type;
            const el_value = elData.value;
            const newline = elData.newline;
            const el_subtype = button.dataset.bsElementsubtype;

            if (!button) return;


            if (el_type == "text" && USE_NEW_MODAL_OPEN.text) {
                console.log("----------OLD FEATURE DISABLED FOR TEXT");
                return;
            }

            if (el_type == "dynamic" && USE_NEW_MODAL_OPEN.dynamic) {
                console.log("----------OLD FEATURE DISABLED FOR DYNAMIC");
                return;
            }

            if (el_type == "image" && USE_NEW_MODAL_OPEN.imageUpload) {
                console.log("----------OLD FEATURE DISABLED FOR IMAGE");
                return;
            }

            if (el_type == "choice" && USE_NEW_MODAL_OPEN.choice) {
                console.log("----------OLD FEATURE DISABLED FOR CHOICE");
                return;
            }

            if (el_type == "page" && USE_NEW_MODAL_OPEN.page) {
                console.log("----------OLD FEATURE DISABLED FOR PAGE");
                return;
            }

            if (el_type == "condition" && USE_NEW_MODAL_OPEN.condition) {
                console.log("----------OLD FEATURE DISABLED FOR CONDITION");
                return;
            }

            if (el_type == "event" && USE_NEW_MODAL_OPEN.event) {
                console.log("----------OLD FEATURE DISABLED FOR EVENT");
                return;
            }

            //-----------------RETURNS SHOULD STOP ANYTHING BEYOND THIS POINT

            const modalInput = document.getElementById(`modal${el_type}Input`);
            const modalTitle = document.getElementById(`modal${el_type}Label`);
            const modalnewlinecheckbox = document.getElementById(`${el_type}newline`);
            const uuidinput = document.getElementById(`hidden${el_type}uuid`);

            try {
                //console.log("---newline? ", newline);
                modalnewlinecheckbox.checked = newline;
            } catch (e) {
                console.log("---No newline checkbox found");
            }

            const requestField = document.getElementById(`${el_type}request`);
            if (requestField) requestField.value = button.dataset.bsRequest || 'PUT';
            const btn_request = button.dataset.bsRequest || 'PUT';

            if (uuidinput) uuidinput.value = button.dataset.bsElementuuid || '';


            if (modalTitle) {
                modalTitle.textContent = btn_request === 'POST' ? `Create new ${el_type}` : `Edit ${el_type}`;
            }
        });

        // Placeholder for any per-modal teardown if needed later
        modal.addEventListener('hidden.bs.modal', () => { });
    });
    */

    // Clear bootstrap remote cache when hidden (jQuery style used in your code)
    $('.elementModal').on?.('hidden.bs.modal', function () {
        $(this).removeData('bs.modal');
    });
    $('.elementAiModal').on?.('hidden.bs.modal', function () {
        $(this).removeData('bs.modal');
    });


}
