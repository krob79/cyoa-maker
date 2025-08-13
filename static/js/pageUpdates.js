
$(function feedback() {
    /**
     * Updates the DOM
     * @param {*} data XHR result
     */

    console.log("--------loading pageUpdates.js!");

    function findUuidInURL() {
        const currentUrl = window.location.href;
        const regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gm;
        const str = window.location.href;;

        let m;
        let result;
        while ((m = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                // console.log(`Found match, group ${groupIndex}: ${match}`);
                result = match;
            });
        }
        return result;
    }

    function parseConditionString(str) {
        const regex = /([A-Za-z0-9]+)([<>=])([A-Za-z0-9]+)/gm;

        let m;
        let result = [];
        while ((m = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                // console.log(`Found match, group ${groupIndex}: ${match}`);
            });
            result = [m[1], m[2], m[3]];
        }

        return result;
    }

    function outputHtmlForElement(item) {
        let html = "";
        switch (item.type) {
            case "page":
                html = `<a class="pageLink" href="/page/${item.uuid}/edit">Edit This Page</a>`;
                break;
            case "image":
                html = `<img class="pageImage" src="/uploads/${item.value}">`;
                break;
            case "choice":
                //TO DO - Make better form validation for entering choices
                let splitText = item.value.split("||");
                if (verifyUUID(splitText[1])) {
                    html = `<strong><a class="pageLink" href="/page/${splitText[1]}/edit">${splitText[0]}</a></strong>`;
                } else {
                    html = `<a class="pageLink" href="#"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" id="Broken-Link-1--Streamline-Flex" height="14" width="14">
  <g id="broken-link-1--break-broken-hyperlink-link-remove-unlink-chain">
    <path id="Vector" stroke="#dd4f53" stroke-linecap="round" stroke-linejoin="round" d="M3.2931 7.1189 1.49673 8.91527c-0.47515 0.4771 -0.741931 1.12303 -0.741931 1.79633 0 0.6734 0.266781 1.3193 0.741931 1.7964 0.4771 0.4752 1.12302 0.7419 1.79637 0.7419 0.67335 0 1.31927 -0.2667 1.79637 -0.7419l1.0663 -1.0663" stroke-width="1"></path>
    <path id="Vector_2" stroke="#dd4f53" stroke-linecap="round" stroke-linejoin="round" d="M8.92238 9.39559h1.78672c0.6726 0 1.3177 -0.26719 1.7933 -0.74279 0.4756 -0.4756 0.7428 -1.12066 0.7428 -1.79326 0 -0.6726 -0.2672 -1.31766 -0.7428 -1.79326s-1.1207 -0.74279 -1.7933 -0.74279H8.17309" stroke-width="1"></path>
    <path id="Vector_3" stroke="#dd4f53" stroke-linecap="round" stroke-linejoin="round" d="m7.00112 0.75 -0.48031 1.92125" stroke-width="1"></path>
    <path id="Vector_4" stroke="#dd4f53" stroke-linecap="round" stroke-linejoin="round" d="m0.757042 3.63184 1.921248 0.96062" stroke-width="1"></path>
    <path id="Vector_5" stroke="#dd4f53" stroke-linecap="round" stroke-linejoin="round" d="m3.15861 0.75 0.96062 1.92125" stroke-width="1"></path>
  </g>
</svg> ${splitText[0]} </a>`;
                }
                break;
            case "text":
                html = `<p>${item.value}</p>`;
                break;
            case "condition":
                html = `<p>${item.value}</p>`;
                break;
        }
        return html;
    }

    //TO DO: these two functions are nearly identical - let's get this down to one
    function assembleElementEntry(item) {
        let html =
            `<div data-uuid="${item.uuid}" class="feedback-item item-list media-list">
                <button type="button" data-bs-uuid="${item.uuid}" class="btn item-delete-btn">X</button>
                <button type="button" class="btn btn-secondary editElement" data-bs-toggle="modal" data-bs-request="PUT" data-bs-elementtype="${item.type}"
                    data-bs-elementuuid="${item.uuid}"
                    data-bs-elementvalue="${item.value}"
                    data-bs-target="#${item.type}UpdateModal">E</button>
                <div class="feedback-item ${item.type}">
                    <div class="feedback-info media-body">
                        <div class="feedback-head">
                            <div class="feedback-title"></div>
                        </div>
                        <div class="feedback-message">
                            ${outputHtmlForElement(item)}
                        </div>
                    </div>
                </div>
            </div>`;
        return html;
    }

    function assemblePageEntry(item) {
        let html =
            `<div data-uuid="${item.uuid}" class="feedback-item item-list media-list">
            <button type="button" data-bs-uuid="${item.uuid}" class="btn item-delete-btn" data-bs-target="#deletePageModalCenter">X</button>
            <button type="button" class="btn btn-secondary editElement" data-bs-toggle="modal" data-bs-request="PUT" data-bs-elementtype="${item.type}"
                data-bs-elementuuid="${item.uuid}" data-bs-elementvalue="${item.value}"
                data-bs-target="#${item.type}UpdateModal">E</button>
            <div class="feedback-item ${item.type}">
                <div class="feedback-info media-body">
                    <div class="feedback-head">
                        <div class="feedback-title">${item.value}</div><small>Page ID: ${item.uuid}</small>
                    </div>
                    <div class="feedback-message">
                        ${outputHtmlForElement(item)}
                    </div>
                </div>
            </div>
        </div>`;
        return html;
    }

    function verifyUUID(uuid) {
        // console.log(`----verifying ${uuid}`, allPageUUIDs.includes(uuid));
        return allPageUUIDs.includes(uuid);
    }

    let allPageUUIDs = [];
    async function updateFeedback(data) {
        allPageUUIDs = data.pageData[0].elements.map(p => p.uuid);

        // console.log("---updateFeedback - allPageUUIDs? ", allPageUUIDs);
        $('.toast').toast();
        const render = [];
        let assembledHTML = "";
        // Reset all error or success status messages
        $('.feedback-status').empty();
        console.log("---Calling updateFeedback() - data errors and story? ", data);
        // All went well
        if (!data.errors && data.pageData) {
            // The input was valid - reset the form
            $('.feedback-form').trigger('reset');
            $('#uploadForm').trigger('reset');

            let uuidInURL = findUuidInURL();
            // console.log("---what's the data looking like?");
            // console.log(data);
            let page;
            //grab uuid from URL and use that to load in and display data
            if (uuidInURL) {
                await fetch(`/page/${uuidInURL}`)
                    .then(response => response.json())
                    .then(data => {
                        // console.log("-----testfetch: ");
                        // console.log(data);
                        page = data.elements;
                    })

            } else {
                console.log("-----ERROR: NO UUID FOUND IN URL!!!");
            }
            // console.log(page);

            //rebuilding the elements and buttons
            $.each(page, function createHtml(key, item) {
                // console.log("-----type? ", item);
                assembledHTML = "";
                if (item.type == "page") {
                    //assemble HTML with functions to match what is shown on storyPage.ejs - need a better way to do this
                    assembledHTML += assemblePageEntry(item);
                } else {
                    assembledHTML += assembleElementEntry(item);
                }
                render.push(assembledHTML);
            });
            // Update feedback-items with what the REST API returned
            $('.feedback-items').html(render.join('\n'));
            // Output the success message
            // $('.feedback-status').html(`<div class="alert alert-success">${data.successMessage}</div>`);
        } else {
            // There was an error
            // Create a list of errors
            // console.log("---we got errors!", data);
            $.each(data.errors, function createHtml(key, error) {
                render.push(`<li>${error.msg}</li>`);
            });
            // Set the status message
            $('.feedback-status').html(
                `<div class="alert alert-danger"><ul>${render.join('\n')}</ul></div>`
            );
        }

        //put all of this code in a function because after everything gets updated, these buttons get rewritten and have to reinitialize 
        initializeDeleteButtons();
        initializeDeleteButtonFromModal();

    }

    function initializeDeleteButtons() {
        const deleteBtns = document.querySelectorAll('.item-delete-btn');
        deleteBtns.forEach(dBtn => {
            //delete buttons for pages should trigger a confirmation modal before deleting anything
            //delete buttons for everything else should instantly delete the item
            if (dBtn.dataset.bsElementtype != 'page') {
                dBtn.addEventListener('click', function (evt) {
                    console.log(`---calling removeElement page refresh`, dBtn.dataset.bsUuid);

                    let btn_uuid = dBtn.dataset.bsUuid;

                    $.ajax({
                        url: '/page/api', // Replace with your actual API endpoint
                        type: 'DELETE', // Specify the HTTP method as DELETE
                        data: { // Optional: You can send data in the request body, though DELETE requests typically don't have a body
                            uuid: btn_uuid,
                        },
                        success: function (story) {
                            // Handle successful deletion, e.g., update UI, show success message
                            console.log('Deletion successful:', story);
                            updateFeedback(story);
                        },
                        error: function (xhr, status, error) {
                            // Handle errors, e.g., display error message
                            console.error('Deletion failed:', error);
                            //console.log('Server response:', xhr.responseText);
                        },
                        complete: function (story) {
                            // console.log("---COMPLETE");
                            // updateFeedback(story);
                        }
                    });
                });
            }
        });
    }

    function initializeDeleteButtonFromModal() {
        //code for button inside the Delete Modal that actually starts the delete process
        const deletePageFromModalBtn = document.getElementById('deletePageFromModalBtn');
        deletePageFromModalBtn.addEventListener('click', function (evt) {
            console.log("---close button ", deletePageFromModalBtn.dataset.bsUuid);

            $.ajax({
                url: '/page/api', // Replace with your actual API endpoint
                type: 'DELETE', // Specify the HTTP method as DELETE
                data: { // Optional: You can send data in the request body, though DELETE requests typically don't have a body
                    uuid: deletePageFromModalBtn.dataset.bsUuid,
                },
                success: function (story) {
                    // Handle successful deletion, e.g., update UI, show success message
                    console.log('Deletion successful:', story);
                    updateFeedback(story);
                },
                error: function (xhr, status, error) {
                    // Handle errors, e.g., display error message
                    console.error('Deletion failed:', error);
                    console.log('Server response:', xhr.responseText);
                },
                complete: function (story) {
                    // console.log("---COMPLETE");
                    //updateFeedback(response.responseJSON);
                    $('#deletePageModalCenter').modal('hide');
                }
            });
        });

        $('#deletePageModalCenter').on('show.bs.modal', function (event) {
            var button = $(event.relatedTarget) // Button that triggered the modal
            var uuid = button.data('bsUuid') // Extract info from data-* attributes
            // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
            // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
            var modal = $(this);
            modal.find('.modal-body').text(`Any links to this page from other pages will now break. A great feature would be to search the other pages for any references to this page's UUID, and automatically remove them.`)
            const deletePageFromModalBtn = document.getElementById('deletePageFromModalBtn');
            deletePageFromModalBtn.setAttribute('data-bs-uuid', uuid);
        });
    }
    //run the initialization as soon as the page loads
    initializeDeleteButtons();
    initializeDeleteButtonFromModal();

    //code applied to all modals that have forms for creating / updating page elements
    const elementModals = document.querySelectorAll('.elementModal');
    const elementAiModals = document.querySelectorAll('.elementAiModal');
    elementAiModals.forEach(modal => {
        modal.addEventListener('show.bs.modal', event => {
            // Pull data from the button that triggered the modal
            let button = event.relatedTarget // Button that triggered the modal

            let uuidinput = document.getElementById(`hiddenAiImageuuid`);
            uuidinput.value = button.dataset.bsElementuuid;



        });

    });

    elementModals.forEach(modal => {
        modal.addEventListener('show.bs.modal', event => {

            // Pull data from the button that triggered the modal
            let button = event.relatedTarget // Button that triggered the modal
            let el_type = button.dataset.bsElementtype;
            let el_value = button.dataset.bsElementvalue;
            const modalInput = document.getElementById(`modal${el_type}Input`);
            const modalTitle = document.getElementById(`modal${el_type}Label`);

            console.log(button.dataset);
            document.getElementById(`${el_type}request`).value = button.dataset.bsRequest;
            let btn_request = button.dataset.bsRequest;

            let uuidinput = document.getElementById(`hidden${el_type}uuid`);
            uuidinput.value = button.dataset.bsElementuuid;


            console.log(`----MODAL OPENING - values found: UUID: ${uuidinput.value}, REQUEST: ${btn_request}, TYPE: ${el_type}, VALUE: ${el_value}`);

            //Go into the modal for the element and create a dynamic link to edit that element's conditions
            function createConditionEditLink(el_type, uuidinput) {
                conditionsLink = document.getElementById(`modal${el_type}Conditions`);
                conditionsLink.setAttribute('href', `/page/${uuidinput.value}/edit`);
                conditionsLink.text = `Set Conditions for this ${el_type} >`;
            }

            let conditionsLink;
            switch (el_type) {
                case "text":
                    createConditionEditLink(el_type, uuidinput);
                    modalInput.value = el_value;
                    break;
                case "image":
                    createConditionEditLink(el_type, uuidinput);
                    let imgPreview = document.getElementById('previewModal');

                    //display an image preview only if it's an update, not a new image 
                    if (btn_request == "PUT") {
                        imgPreview.src = `/uploads/${el_value}`;
                        imgPreview.style = "display: block;";
                    } else {
                        imgPreview.style = "display: none;";
                    }
                    break;
                case "choice":
                    createConditionEditLink(el_type, uuidinput);
                    let splitValue = el_value.split("||");
                    //TO DO: Clean up the logic and naming conventions of the choices and inputs
                    let dropdown = document.getElementById("choiceDestinationModal");
                    let hiddendestination = document.getElementById("destinationModal");
                    //we need the story UUID to create a new page, if needed
                    let hiddenstoryuuid = document.getElementById("hiddenstoryuuid");
                    hiddenstoryuuid.value = button.dataset.bsStoryuuid;
                    modalInput.value = splitValue[0];

                    if (!splitValue[1]) {
                        //if there isn't a destination available, set the value of the dropdown AND the hidden destination value to "new"
                        dropdown.value = "New";
                        document.getElementById("destinationModal").value = "New";
                    } else {
                        //otherwise, set both to the value found
                        dropdown.value = splitValue[1];
                        hiddendestination.value = splitValue[1];
                    }
                    break;
                case "page":
                    modalInput.value = el_value;
                    break;
                case "condition":
                    let conditionString = el_value;
                    let values = parseConditionString(el_value);
                    document.getElementById('modalconditionInput').value = values[0];
                    document.getElementById('conditionComparisonModal').value = values[1];
                    document.getElementById('modalconditionInput2').value = values[2];
                    break;
            }

            if (btn_request == "POST") {
                console.log("---create new title for ", el_type);
                modalTitle.textContent = 'Create new  ' + el_type;
            } else {
                console.log("---edit old title for ", el_type);
                modalTitle.textContent = 'Edit ' + el_type;
            }
        });

        modal.addEventListener('hidden.bs.modal', event => {


        });
    });

    //this code fires every time the element modals disappear
    $('.elementModal').on('hidden.bs.modal', function (event) {
        $(this).removeData('bs.modal');
    });

    $('.elementAiModal').on('hidden.bs.modal', function (event) {
        $(this).removeData('bs.modal');
    });


    //This is the method for updating existing elements, but will eventually be the only way to both create and update page elements
    const textForm = document.getElementById("textFormModal");
    textForm.addEventListener("submit", function (e) {
        // Prevent the default submit form event
        e.preventDefault();
        console.log("-----TEXT FORM SUBMIT FROM MODAL");

        const formData = new FormData(textForm);

        for (const pair of formData.entries()) {
            console.log(pair[0], ":", pair[1]);
        }

        //if "textrequest" is "POST", then this is new content, and we should do a POST request
        //otherwise, this is existing content, so do a PUT request 
        if (formData.get("textrequest") == "POST") {
            console.log("----creating new content");
            $.ajax({
                url: '/page/api',
                type: 'POST',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get("uuid"),
                    section: formData.get("section"),
                    type: "text",
                    value: formData.get("modaltextInput"),
                    html: `<p class="pageText">${formData.get("modaltextInput")}</p>`
                },
                success: function (data) {
                    console.log("----WE CREATED BULLSHIT FROM THE MODAL");
                    console.log(data);
                    $('#myTextToast').toast('show');
                    updateFeedback(data);
                },
                complete: function () {
                    $(`.elementModal`).modal('hide');
                }
            });
        } else {

            // XHR POST request
            $.ajax({
                url: '/page/api',
                type: 'PUT',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get("uuid"),
                    newDataObj: { value: formData.get("modaltextInput"), html: `<p class="pageText">${formData.get("modaltextInput")}</p>` }
                },
                success: function (data) {
                    console.log("----WE SUBMITTED BULLSHIT FROM THE MODAL");
                    console.log(data);
                    updateFeedback(data);
                },
                complete: function () {
                    $(`.elementModal`).modal('hide');
                }
            });

        }



    });

    const uploadImageForm = document.getElementById("uploadFormModal");
    uploadImageForm.addEventListener("submit", (e) => {
        submitImage(e);
    });

    const uploadImageFormModal_AI = document.getElementById("uploadImageFormModal_AI");
    uploadImageFormModal_AI.addEventListener("submit", (e) => {
        submitImage(e);
    });

    async function createLocalImgUploadPath(formData) {
        //call fetch to "/upload" app route, using the formData as the request body
        //this is the fetch request that actually needs the file object from the form
        const res = await fetch('/upload', { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.text();
            console.error('Upload Failed', err);
        }

        const imgPath = await res.json();
        console.log("----createLocalImgUploadPath(): ", imgPath);
        return imgPath;

    }

    async function submitImage(e) {
        //get the right form ID
        const uploadForm = document.getElementById(e.target.id);
        // Prevent the default submit form event
        e.preventDefault();

        //create formData object from form
        const formData = new FormData(uploadForm);
        console.log("----SUBMITTING IMAGE FORM DATA FROM MODAL ", e.target.id);
        for (const pair of formData.entries()) {
            console.log("--", pair[0], ":", pair[1]);
        }

        //needed when user is browsing for local images on their hard drive
        let imgPath;
        //if the form submitted is from regular local images, generate the img copy and return the file path
        if (e.target.id == "uploadFormModal") {
            imgPath = await createLocalImgUploadPath(formData);
        } else {

        }


        let assembledData = {
            uuid: formData.get(`uuid`),
            newDataObj: { value: imgPath, html: `<img class="pageImage" src="/uploads/${imgPath}">` }
        }
        console.log(`----SENDING ASSEMBLED DATA in ${formData.get("imagerequest")} request to /page/api`);
        for (const pair of formData.entries()) {
            console.log("--", pair[0], ":", pair[1]);
        }

        if (formData.get("imagerequest") == "POST") {

            $.ajax({
                url: '/page/api',
                type: 'POST',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get(`uuid`),
                    section: formData.get("section"),
                    type: "image",
                    value: imgPath,
                    conditions: [],
                    html: `<img class="pageImage" src="/uploads/${imgPath}">`
                },
                success: function (data) {
                    console.log("----WE SUBMITTED IMAGES FROM THE MODAL");
                    console.log(data);
                    $('#myImageToast').toast('show');
                    updateFeedback(data);
                },
                complete: function () {
                    $('.elementModal').modal('hide');
                }
            });

        } else {
            // XHR POST request
            $.ajax({
                url: '/page/api',
                type: 'PUT',
                // Gather all data from the form and create a JSON object from it
                data: {
                    ...assembledData
                },
                success: function (data) {
                    console.log(data);
                    updateFeedback(data);
                },
                complete: function () {
                    $('.elementModal').modal('hide');
                }
            });

        }
    };

    const choiceForm = document.getElementById("choiceFormModal");
    choiceForm.addEventListener("submit", function (e) {
        // Prevent the default submit form event
        e.preventDefault();
        console.log("-----CHOICE FORM SUBMIT FROM MODAL");

        const formData = new FormData(choiceForm);

        for (const pair of formData.entries()) {
            console.log(pair[0], ":", pair[1]);
        }

        let possibleNewDestinationUUID;

        //Create new page along with new choice and connect them together
        if (formData.get("destinationModal") == "New") {
            console.log("----creating new page with new choice...");
            $.ajax({
                url: `/page/newpage/${formData.get("hiddenstoryuuid")}`,
                type: 'POST',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get("hiddenstoryuuid"),
                    value: formData.get("modalchoiceInput")
                },
                success: function (data) {
                    console.log("----WE CREATED PAGE FROM THE MODAL");
                    console.log(data);
                    $('#myPageToast').toast('show');
                    possibleNewDestinationUUID = data.newUUID;
                    console.log("----NEW POSSIBLE DESTINATION!!! ", possibleNewDestinationUUID);
                    runSecondRequest(possibleNewDestinationUUID);
                },
                complete: function () {
                    // $(`.elementModal`).modal('hide');
                }
            });
        } else {
            console.log("----we are NOT creating a new page with the new choice!");
            possibleNewDestinationUUID = formData.get("destinationModal");
            runSecondRequest(possibleNewDestinationUUID);
        }

        console.log("----NOW WHAT's THE FORM DATA? ");
        for (const pair of formData.entries()) {
            console.log("--", pair[0], ":", pair[1]);
        }

        //we have to put this in a function so that it doesn't attempt to run before the page is created with a new ID
        function runSecondRequest(possibleNewDestinationUUID) {
            let assembledData = {
                uuid: formData.get("hiddenchoiceuuid"),
                newDataObj: { value: `${formData.get("modalchoiceInput")}||${possibleNewDestinationUUID}`, html: `<a class="pageLink" href="/page/${possibleNewDestinationUUID}/edit">${formData.get("modalchoiceInput")}</a>` }
            }
            console.log("----SENDING ASSEMBLED DATA...");
            console.log(assembledData);
            console.log("----running second request");
            if (formData.get("choicerequest") == "POST") {
                console.log("----creating new content");

                // XHR POST request
                $.ajax({
                    url: '/page/api',
                    type: 'POST',
                    // Gather all data from the form and create a JSON object from it
                    data: {
                        uuid: formData.get("hiddenchoiceuuid"),
                        section: formData.get("section"),
                        type: "choice",
                        value: `${formData.get("modalchoiceInput")}||${possibleNewDestinationUUID}`,
                        html: `<a class="pageLink" href="/page/${possibleNewDestinationUUID}/edit">${formData.get("modalchoiceInput")}</a>`
                    },
                    success: function (data) {
                        console.log("----WE SUBMITTED CHOICES FROM THE MODAL");
                        console.log(data);
                        $('#myChoiceToast').toast('show');
                        updateFeedback(data);
                    },
                    complete: function () {
                        $(`.elementModal`).modal('hide');
                    }
                });

            } else {

                $.ajax({
                    url: '/page/api',
                    type: 'PUT',
                    // Gather all data from the form and create a JSON object from it
                    data: {
                        ...assembledData
                    },
                    success: function (data) {
                        console.log(data);
                        updateFeedback(data);
                    },
                    complete: function () {
                        $(`.elementModal`).modal('hide');
                    }
                });


            }
        }

    });

    const conditionForm = document.getElementById("conditionFormModal");
    conditionForm.addEventListener("submit", function (e) {
        // Prevent the default submit form event
        e.preventDefault();
        console.log("-----CHOICE FORM SUBMIT FROM MODAL");

        const formData = new FormData(conditionForm);

        for (const pair of formData.entries()) {
            console.log(pair[0], ":", pair[1]);
        }

        let assembledData = {
            uuid: formData.get("hiddenconditionuuid"),
            newDataObj: { value: `${formData.get("modalconditionInput")}${formData.get("conditionComparisonModal")}${formData.get("modalconditionInput2")}` }
        }
        console.log("----SENDING ASSEMBLED DATA...");
        console.log(assembledData);

        if (formData.get("conditionrequest") == "POST") {
            console.log("----creating new content");

            // XHR POST request
            $.ajax({
                url: '/page/api',
                type: 'POST',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get("hiddenconditionuuid"),
                    section: formData.get("section"),
                    type: "condition",
                    value: `${formData.get("modalconditionInput")}${formData.get("conditionComparisonModal")}${formData.get("modalconditionInput2")}`
                },
                success: function (data) {
                    console.log("----WE SUBMITTED BULLSHIT FROM THE MODAL");
                    console.log(data);
                    $('#myConditionToast').toast('show');
                    updateFeedback(data);
                },
                complete: function () {
                    $(`.elementModal`).modal('hide');
                }
            });

        } else {

            $.ajax({
                url: '/page/api',
                type: 'PUT',
                // Gather all data from the form and create a JSON object from it
                data: {
                    ...assembledData
                },
                success: function (data) {
                    console.log(data);
                    updateFeedback(data);
                },
                complete: function () {
                    $(`.elementModal`).modal('hide');
                }
            });


        }

    });

    //This is the method for updating existing elements, but will eventually be the only way to both create and update page elements
    const pageForm = document.getElementById("pageFormModal");
    pageForm.addEventListener("submit", function (e) {
        // Prevent the default submit form event
        e.preventDefault();
        console.log("-----PAGE FORM SUBMIT FROM MODAL");

        const formData = new FormData(pageForm);

        for (const pair of formData.entries()) {
            console.log(pair[0], ":", pair[1]);
        }

        //if "textrequest" is "POST", then this is new content, and we should do a POST request
        //otherwise, this is existing content, so do a PUT request 
        if (formData.get("pagerequest") == "POST") {
            console.log("----creating new content");
            $.ajax({
                url: '/page/api',
                type: 'POST',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get("uuid"),
                    section: formData.get("section"),
                    type: "page",
                    value: formData.get("modalpageInput")
                },
                success: function (data) {
                    console.log("----WE CREATED PAGE FROM THE MODAL");
                    console.log(data);
                    $('#myPageToast').toast('show');
                    updateFeedback(data);
                },
                complete: function () {
                    $(`.elementModal`).modal('hide');
                }
            });
        } else {

            // XHR POST request
            $.ajax({
                url: '/page/api',
                type: 'PUT',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get("uuid"),
                    newDataObj: { value: formData.get("modalpageInput") }
                },
                success: function (data) {
                    console.log("----WE UPDATED PAGE FROM THE MODAL");
                    console.log(data);
                    updateFeedback(data);
                },
                complete: function () {
                    $(`.elementModal`).modal('hide');
                }
            });

        }

    });


});