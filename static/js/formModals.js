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