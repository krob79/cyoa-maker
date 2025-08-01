
$(function feedback() {
    /**
     * Updates the DOM
     * @param {*} data XHR result
     */

    console.log("--------loading pageUpdates.js!");

    function findUuidInURL() {
        const currentUrl = window.location.href;
        const regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gm;

        // Alternative syntax using RegExp constructor
        // const regex = new RegExp('[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'gm')

        const str = window.location.href;;

        // Reset `lastIndex` if this regex is defined globally
        // regex.lastIndex = 0;

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

    function assembleElementEntry(item) {
        let html =
            `<div data-uuid="${item.uuid}" class="feedback-item item-list media-list">
                <button type="button" data-uuid="${item.uuid}" class="btn element-item-delete-btn">X</button>
                <button type="button" class="btn btn-secondary editElement" data-toggle="modal" data-request="PUT" data-elementtype="${item.type}"
                    data-elementuuid="${item.uuid}"
                    data-elementvalue="${item.value}"
                    data-target="#${item.type}UpdateModal">E</button>
                <div class="feedback-item ${item.type}">
                    <div class="feedback-info media-body">
                        <div class="feedback-head">
                            <div class="feedback-title"></div>
                        </div>
                        <div class="feedback-message">
                            ${item.html}
                        </div>
                    </div>
                </div>
            </div>`;
        return html;
    }

    function assemblePageEntry(item) {
        let html =
            `<div data-uuid="${item.uuid}" class="feedback-item item-list media-list">
            <button type="button" data-uuid="${item.uuid}" id="delete" class="btn element-item-delete-btn">X</button>
            <button type="button" class="btn btn-secondary editElement" data-toggle="modal" data-request="PUT" data-elementtype="${item.type}"
                data-elementuuid="${item.uuid}" data-elementvalue="${item.value}"
                data-target="${item.type}UpdateModal">E</button>
            <div class="feedback-item ${item.type}">
                <div class="feedback-info media-body">
                    <div class="feedback-head">
                        <div class="feedback-title">${item.title}</div><small>Page ID: ${item.uuid}</small>
                    </div>
                    <div class="feedback-message">
                        ${item.html}
                    </div>
                </div>
            </div>
        </div>`;
        return html;
    }


    function updateFeedback(data) {
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
            //so that the changes happen instaly on the page
            let uuidInURL = findUuidInURL();
            // console.log("---what's my page?");
            let page;
            if (uuidInURL) {
                page = data.pageData[0].pages.filter((p) => p.uuid == uuidInURL)[0].elements;
            } else {
                page = data.pageData[0].pages;
            }
            console.log(page);

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
            $('.feedback-status').html(`<div class="alert alert-success">${data.successMessage}</div>`);
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

        $('.element-item-delete-btn').on('click', function (evt) {
            console.log(`---calling removeElement after AJAX`, this);

            $.ajax({
                url: '/page/api', // Replace with your actual API endpoint
                type: 'DELETE', // Specify the HTTP method as DELETE
                data: { // Optional: You can send data in the request body, though DELETE requests typically don't have a body
                    uuid: $(this).data('uuid'),
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
                    console.log("---COMPLETE");
                }
            });
        });


        //DUPLICATE CODE!! I DON'T LIKE THIS AT ALL, BUT WE'RE LEAVING IT FOR NOW
        //code for button inside the Delete Modal that actually starts the delete process
        $('#deletePageFromModalBtn').on('click', function (evt) {
            console.log("---close button ", $(this).data('uuid'));

            $.ajax({
                url: '/page/api', // Replace with your actual API endpoint
                type: 'DELETE', // Specify the HTTP method as DELETE
                data: { // Optional: You can send data in the request body, though DELETE requests typically don't have a body
                    uuid: $(this).data('uuid'),
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
                    console.log("---COMPLETE");
                    //updateFeedback(response.responseJSON);
                    $('#deletePageModalCenter').modal('hide');
                }
            });

        });



        $('#deletePageModalCenter').on('show.bs.modal', function (event) {

            var button = $(event.relatedTarget) // Button that triggered the modal
            var uuid = button.data('uuid') // Extract info from data-* attributes
            // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
            // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
            var modal = $(this)
            modal.find('.modal-body').text(`Any links to this page from other pages will now break. A great feature would be to search the other pages for any references to this page's UUID, and automatically remove them.`)
            const deletePageButton = document.getElementById('deletePageFromModalBtn');
            //why are we setting attibutes to a delete button after the modal it triggers is already open?
            deletePageButton.setAttribute('data-uuid', uuid);
        })



    }

    $('.element-item-delete-btn').on('click', function (evt) {
        console.log(`---calling removeElement page refresh`, this);

        $.ajax({
            url: '/page/api', // Replace with your actual API endpoint
            type: 'DELETE', // Specify the HTTP method as DELETE
            data: { // Optional: You can send data in the request body, though DELETE requests typically don't have a body
                uuid: $(this).data('uuid'),
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
                console.log("---COMPLETE");
                // updateFeedback(story);
            }
        });
    });

    //DUPLICATE CODE!! I DON'T LIKE THIS AT ALL, BUT WE'RE LEAVING IT FOR NOW
    //code for button inside the Delete Modal that actually starts the delete process
    $('#deletePageFromModalBtn').on('click', function (evt) {
        console.log("---close button ", $(this).data('uuid'));

        $.ajax({
            url: '/page/api', // Replace with your actual API endpoint
            type: 'DELETE', // Specify the HTTP method as DELETE
            data: { // Optional: You can send data in the request body, though DELETE requests typically don't have a body
                uuid: $(this).data('uuid'),
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
                console.log("---COMPLETE");
                //updateFeedback(response.responseJSON);
                $('#deletePageModalCenter').modal('hide');
            }
        });

    });

    $('#deletePageModalCenter').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget) // Button that triggered the modal
        var uuid = button.data('uuid') // Extract info from data-* attributes
        // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
        // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
        var modal = $(this)
        modal.find('.modal-body').text(`Any links to this page from other pages will now break. A great feature would be to search the other pages for any references to this page's UUID, and automatically remove them.`)
        const deletePageButton = document.getElementById('deletePageFromModalBtn');
        deletePageButton.setAttribute('data-uuid', uuid);
    });

    //this is not really being used at the moment, but created it to try and store a file reference in a file input field...?
    async function createImageFileFromUrl(imageUrl, fileName = 'image.png', fileType = 'image/png') {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const imageFile = new File([blob], fileName, { type: fileType });
        return imageFile;
    }

    //this code fires every time the element modals appear
    $('.elementModal').on('show.bs.modal', function (event) {
        let button = $(event.relatedTarget) // Button that triggered the modal
        //get the UUID from the data on the button
        let buttonRequest = button.data('request');

        let uuid = button.data('elementuuid');
        let elementtype = button.data('elementtype'); // Extract info from data-* attributes
        let value = button.data('elementvalue');
        console.log(`----MODAL OPENING - values found: UUID: ${uuid}, REQUEST: ${buttonRequest}, TYPE: ${elementtype}, VALUE: ${value}`);

        let modal = $(this)
        let uuidinput = document.getElementById(`hidden${elementtype}uuid`);
        uuidinput.value = uuid;
        modal.find('uuid').val(uuid);
        let request = document.getElementById(`${elementtype}request`);
        request.value = buttonRequest;

        if (elementtype == "image") {
            let imgPreview = document.getElementById('previewModal');
            imgPreview.src = `/uploads/${value}`;
            let imgNameSplit = value.split(".");
            // console.log(`---imgNameSplit: `, imgNameSplit);
            //the code below isn't doing anything yet - do we need it?
            let fileExtension = imgNameSplit[imgNameSplit.length - 1];
            createImageFileFromUrl(`/uploads/${value}`, value, `image/${fileExtension}`).then(file => {
                console.log(file); // This is your new File object
                value = file;
            });
        }

        if (elementtype == "choice") {
            let splitValue = value.split("||");
            let dropdown = document.getElementById("choiceDestinationModal");
            let labelInput = document.getElementById("modalchoiceInput");

            labelInput.value = splitValue[0];
            dropdown.value = splitValue[1];

        }

        if (elementtype == "text") {
            let txtInput = document.getElementById(`modal${elementtype}Input`);
            txtInput.value = `${value}`;

            $(this).find('#modaltextInput').text(value);
        } else {
            modal.find(`modal${elementtype}Input`).text(value);
        }
        if (buttonRequest == "POST") {
            modal.find('.modal-title').text('Create new  ' + elementtype);
        } else {
            modal.find('.modal-title').text('Edit  ' + elementtype);
        }

    });

    //this code fires every time the element modals disappear
    $('.elementModal').on('hidden.bs.modal', function (event) {
        $(this).removeData('bs.modal');
    });

    /**
     * Attaches to a form and sends the data to our REST endpoint
     * This is for communicating with the server via a REST API to fetch data and show it to
     * the user without needing to refresh the page
     */
    $('.textUploadForm').submit(function submitFeedback(e) {
        // Prevent the default submit form event
        e.preventDefault();

        //for text input
        const textForm = document.getElementById("textForm");
        const formData = new FormData(textForm);
        console.log("----SUBMITTING TEXT FORM ");
        for (const pair of formData.entries()) {
            console.log(pair[0], ":", pair[1]);
        }

        // XHR POST request
        $.post(
            '/page/api',
            // Gather all data from the form and create a JSON object from it
            {
                uuid: formData.get("uuid"),
                section: formData.get("section"),
                type: "text",
                value: formData.get("textInput"),
                html: `<p class="pageText">${formData.get("textInput")}</p>`
            },
            // Callback to be called with the data
            updateFeedback
        );
    });

    //This is the method for updating existing elements, but will eventually be the only way to both create and update page elements
    $('#textFormModal').submit(function (e) {
        // Prevent the default submit form event
        e.preventDefault();
        console.log("-----TEXT FORM SUBMIT FROM MODAL");

        const textForm = document.getElementById("textFormModal");
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
                    updateFeedback(data);
                },
                complete: function () {
                    $(`.elementModal`).modal('hide');
                    const toastLiveExample = document.getElementById('liveToast');
                    const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastLiveExample);
                    toastBootstrap.show();
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

    $('#choiceForm').submit(function submitFeedback(e) {
        // Prevent the default submit form event
        e.preventDefault();

        const formData = new FormData(choiceForm);
        console.log("----SUBMITTING CHOICE FORM ", formData);
        for (const pair of formData.entries()) {
            console.log("--", pair[0], ":", pair[1]);
        }

        // XHR POST request
        $.post(
            '/page/api',
            // Gather all data from the form and create a JSON object from it
            {
                uuid: formData.get("uuid"),
                section: formData.get("section"),
                type: "choice",
                value: `${formData.get("choiceLabel")}||${formData.get("destination")}`,
                html: `<a class="pageLink" href="/page/${formData.get("destination")}/edit">${formData.get("choiceLabel")}</a>`
            },
            // Callback to be called with the data
            updateFeedback
        );
    });

    $('#choiceFormModal').submit(function (e) {
        // Prevent the default submit form event
        e.preventDefault();
        console.log("-----CHOICE FORM SUBMIT FROM MODAL");

        const choiceForm = document.getElementById("choiceFormModal");
        const formData = new FormData(choiceForm);

        for (const pair of formData.entries()) {
            console.log(pair[0], ":", pair[1]);
        }

        let assembledData = {
            uuid: formData.get("hiddenchoiceuuid"),
            newDataObj: { value: `${formData.get("modalchoiceInput")}||${formData.get("choiceDestinationModal")}`, html: `<a class="pageLink" href="/page/${formData.get("choiceDestinationModal")}/edit">${formData.get("modalchoiceInput")}</a>` }
        }
        console.log("----SENDING ASSEMBLED DATA...");
        console.log(assembledData);
        // for (const pair of assembledData.entries()) {
        //     console.log("--", pair[0], ":", pair[1]);
        // }

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
                    value: `${formData.get("modalchoiceInput")}||${formData.get("destinationModal")}`,
                    html: `<a class="pageLink" href="/page/${formData.get("destinationModal")}/edit">${formData.get("modalchoiceInput")}</a>`
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

        } else {

            $.ajax({
                url: '/page/api',
                type: 'PUT',
                // Gather all data from the form and create a JSON object from it
                data: {
                    ...assembledData
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

    $('#uploadForm').submit(async function submitFeedback(e) {
        // Prevent the default submit form event
        e.preventDefault();
        //get reference to form
        const uploadForm = document.getElementById("uploadForm");
        //create formData object from form
        const formData = new FormData(uploadForm);
        console.log("----SUBMITTING IMAGE FORM DATA");
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
        console.log("----image found: ", imgPath);

        // XHR POST request
        $.post(
            '/page/api',
            // Gather all data from the form and create a JSON object from it
            {
                uuid: formData.get("uuid"),
                section: formData.get("section"),
                type: "image",
                value: imgPath,
                html: `<img class="pageImage" src="/uploads/${imgPath}">`
            },
            // Callback to be called with the data
            updateFeedback
        );
    });

    $('#uploadFormModal').submit(async function submitFeedback(e) {
        // Prevent the default submit form event
        e.preventDefault();

        //get reference to form
        const uploadForm = document.getElementById("uploadFormModal");
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
        console.log("----image found from modal: ", imgPath);

        let assembledData = {
            uuid: formData.get("uuid"),
            newDataObj: { value: imgPath, html: `<img class="pageImage" src="/uploads/${imgPath}">` }
        }
        console.log("----SENDING ASSEMBLED DATA in PUT request to /page/api");
        for (const pair of formData.entries()) {
            console.log("--", pair[0], ":", pair[1]);
        }

        if (formData.get("imagerequest") == "POST") {
            console.log("----creating new content");

            $.ajax({
                url: '/page/api',
                type: 'POST',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get("uuid"),
                    section: formData.get("section"),
                    type: "image",
                    value: imgPath,
                    html: `<img class="pageImage" src="/uploads/${imgPath}">`
                },
                success: function (data) {
                    console.log("----WE SUBMITTED IMAGES FROM THE MODAL");
                    console.log(data);
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
                    console.log("----WE SUBMITTED IMAGES FROM THE MODAL");
                    console.log(data);
                    updateFeedback(data);
                },
                complete: function () {
                    $('.elementModal').modal('hide');
                }
            });

        }


    });

    $('#pageForm').submit(function submitFeedback(e) {
        // Prevent the default submit form event
        e.preventDefault();


        const formData = new FormData(pageForm);
        console.log("----SUBMITTING NEW PAGE FORM ");
        for (const pair of formData.entries()) {
            console.log(pair[0], ":", pair[1]);
        }

        // XHR POST request
        $.post(
            '/page/api',
            // Gather all data from the form and create a JSON object from it
            {
                uuid: formData.get("uuid"),
                title: formData.get("pageName"),
                section: formData.get("section"),
                type: "page",
                value: formData.get("pageName"),
                html: `<a class="pageText" href="/page/${formData.get("uuid")}/edit">Edit Page</a>`
            },
            // Callback to be called with the data
            updateFeedback
        );
    });


});