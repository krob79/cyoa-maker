
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

    function findRegExGroups(str) {
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
                if (splitText[0] != undefined || splitText[0] != "" || splitText[1] != undefined || splitText[1] != "") {
                    html = `<strong><a class="pageLink" href="/page/${splitText[1]}/edit">${splitText[0]}</a></strong>`;
                } else {
                    html = `<a class="pageLink" href="#">(BROKEN LINK PLEASE FIX)</a>`;
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


    async function updateFeedback(data) {
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

            //this is ridiculous to have to filter this out, but we'll do it for now.
            //basically, we're re-filtering the whole data object here back down to the elements
            //so that the changes happen instantly on the page
            let uuidInURL = findUuidInURL();
            console.log("---what's the data looking like?");
            console.log(data);
            let page;
            if (uuidInURL) {
                await fetch(`/page/${uuidInURL}`)
                    .then(response => response.json())
                    .then(data => {
                        // console.log("-----testfetch: ");
                        console.log(data);
                        page = data.elements;
                    })

            } else {
                console.log("-----ERROR: NO UUID FOUND IN URL!!!");
            }
            console.log(page);

            $.each(page, function createHtml(key, item) {
                console.log("-----type? ", item);
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
            console.log("---we got errors!", data);
            $.each(data.errors, function createHtml(key, error) {
                render.push(`
          <li>${error.msg}</li>
        `);
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


    //this is not really being used at the moment, but created it to try and store a file reference in a file input field...?
    async function createImageFileFromUrl(imageUrl, fileName = 'image.png', fileType = 'image/png') {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const imageFile = new File([blob], fileName, { type: fileType });
        return imageFile;
    }

    //code applied to all modals that have forms for creating / updating page elements
    const elementModals = document.querySelectorAll('.elementModal');
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

            if (el_type == "text" || el_type == "image" || el_type == "choice") {
                let conditionsLink = document.getElementById(`modal${el_type}Conditions`);
                conditionsLink.setAttribute('href', `/page/${uuidinput.value}/edit`);
                conditionsLink.text = `Set Conditions for this ${el_type} >`;
            }

            if (el_type == "page") {
                modalInput.value = el_value;
            }

            if (el_type == "image") {
                let imgPreview = document.getElementById('previewModal');

                if (btn_request == "PUT") {
                    imgPreview.src = `/uploads/${el_value}`;
                    imgPreview.style = "display: block;";
                } else {
                    imgPreview.style = "display: none;";
                }
                let imgNameSplit = el_value.split(".");
                // console.log(`---imgNameSplit: `, imgNameSplit);

                //the code below isn't doing anything yet - do we need it?
                let fileExtension = imgNameSplit[imgNameSplit.length - 1];
                createImageFileFromUrl(`/uploads/${el_value}`, el_value, `image/${fileExtension}`).then(file => {
                    console.log(file); // This is your new File object
                    el_value = file;
                });
            }

            if (el_type == "choice") {
                let splitValue = el_value.split("||");
                let dropdown = document.getElementById("choiceDestinationModal");
                console.log(`----splitValue: ${splitValue[1]}  dropdown: `);
                let hiddendestination = document.getElementById("destinationModal");
                let hiddenstoryuuid = document.getElementById("hiddenstoryuuid");
                hiddenstoryuuid.value = button.dataset.bsStoryuuid;

                modalInput.value = splitValue[0];
                if (!splitValue[1]) {
                    dropdown.value = "New";
                    document.getElementById("destinationModal").value = "New";
                } else {
                    dropdown.value = splitValue[1];
                    hiddendestination.value = splitValue[1];
                }



            }

            if (el_type == "condition") {
                let conditionString = el_value;
                let values = findRegExGroups(el_value);
                document.getElementById('modalconditionInput').value = values[0];
                document.getElementById('conditionComparisonModal').value = values[1];
                document.getElementById('modalconditionInput2').value = values[2];

            }

            if (el_type == "text") {
                //which one of these works?
                // txtInput.value = `${el_value}`;
                modalInput.value = el_value;
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

    const uploadForm = document.getElementById("uploadFormModal");
    uploadForm.addEventListener("submit", async function (e) {
        // Prevent the default submit form event
        e.preventDefault();

        //create formData object from form
        const formData = new FormData(uploadForm);
        console.log("----SUBMITTING IMAGE FORM DATA FROM MODAL");
        for (const pair of formData.entries()) {
            console.log("--", pair[0], ":", pair[1]);
        }

        //call fetch to "/upload" app route, using the formData as the request body
        const res = await fetch('/upload', { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.text();
            console.error('Upload Failed', err);
        }

        const imgPath = await res.json();
        // console.log("----image found from modal: ", imgPath);

        let assembledData = {
            uuid: formData.get("uuid"),
            newDataObj: { value: imgPath, html: `<img class="pageImage" src="/uploads/${imgPath}">` }
        }
        console.log("----SENDING ASSEMBLED DATA in PUT request to /page/api");
        for (const pair of formData.entries()) {
            console.log("--", pair[0], ":", pair[1]);
        }

        if (formData.get("imagerequest") == "POST") {

            $.ajax({
                url: '/page/api',
                type: 'POST',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get("uuid"),
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


    });

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

        //BIG ADDITION - Create new page along with new choice and connect them together
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