
$(function feedback() {
    /**
     * Updates the DOM
     * @param {*} data XHR result
     */

    console.log("--------loading pageUpdates.js!");

    //a small function that just looks at all existing UUIDs and verifies if the supplied UUID actually exists
    //used for determining if choice elements contain UUIDs for pages that have been deleted
    function verifyUUID(uuid) {
        // console.log(`----verifying ${uuid}`, allPageUUIDs.includes(uuid));
        return allPageUUIDs.includes(uuid);
    }

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

    //applying drag and drop code
    let el = document.getElementById('draggableList');
    try {
        let sortable = new Sortable(el, {
            swapThreshold: 0.75, ghostClass: 'ghost', animation: 150, handle: ".drag-handle", onEnd: (evt) => { reorderElements({ from: evt.oldIndex, to: evt.newIndex }); console.log(`From: ${evt.oldIndex} to ${evt.newIndex}`) },
        });
    } catch (err) {
        console.log("---no sortable objects found");
    }

    function moveElement(arr, old_index, new_index) {
        // Handle cases where new_index is beyond the current array length by padding with undefined
        if (new_index >= arr.length) {
            let k = new_index - arr.length + 1;
            while (k--) {
                arr.push(undefined);
            }
        }
        // Remove the element from its old position and store it
        const [element] = arr.splice(old_index, 1);
        // Insert the stored element at the new position
        arr.splice(new_index, 0, element);
        return arr;
    }

    async function reorderElements({ from, to }) {
        console.log(`---calling reorderElements!! ${from} - ${to}`);
        let uuidInURL = findUuidInURL();
        let elements;
        //grab uuid from URL and use that to load in and display data
        if (uuidInURL) {
            await fetch(`/page/${uuidInURL}`)
                .then(response => response.json())
                .then(data => {
                    // console.log("-----testfetch: ");
                    // console.log(data);
                    elements = data.elements;
                })

            //Make deep copy of the array so that ALL nested elements are swapped as well
            let deepCopyArray = structuredClone(elements);
            //swap the elements in the array
            deepCopyArray = moveElement(deepCopyArray, from, to);

            let myNewDataObj = { elements: deepCopyArray };
            console.log(myNewDataObj);

            // XHR POST request
            $.ajax({
                url: '/page/api',
                type: 'PUT',
                contentType: 'application/json; charset=UTF-8',
                // Gather all data from the form and create a JSON object from it
                data: JSON.stringify({
                    uuid: uuidInURL,
                    newDataObj: myNewDataObj
                }),
                success: function (data) {
                    console.log("----WE SUBMITTED REORDERED ELEMENTS!!");
                    console.log(data);
                    updateDisplay(data);
                }
            });

        } else {
            console.log("-----ERROR: NO UUID FOUND IN URL!!!");
        }

    }

    function outputHtmlForElement(item) {
        let html = "";
        let splitText = "";
        switch (item.type) {
            case "page":
                html = `<a class="pageLink" href="/page/${item.uuid}/edit">View Page</a>`;
                break;
            case "text":
                html = `<p class='pageText'>${item.value}</p>`;
                break;
            case "image":
                html = `<img class="pageImage" src="/uploads/${item.value}">`;
                break;
            case "choice":
                //TO DO - Make better form validation for entering choices
                splitText = item.value.split("||");
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
            case "event":
                splitText = item.value.split("_");
                html = `<strong><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 -960 960 960">
<path d="M480-280q17 0 28.5-11.5T520-320t-11.5-28.5T480-360t-28.5 11.5T440-320t11.5 28.5T480-280m-40-160h80v-240h-80zm40 412L346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140zm0-340"></path>
</svg> Custom ${splitText[0]} event: ${splitText[1]}${splitText[2]}${splitText[3]}</strong>`;
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
            `<div class="content-chunk">
             <div class="drag-handle">::</div>
                    <div data-uuid="${item.uuid}" class="feedback-item item-list media-list">
                        <div class="editButtons">
                            <button type="button" data-bs-uuid="${item.uuid}" class="btn item-delete-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" name="deleteIcon" width="24" height="24" viewBox="0 -960 960 960">
                                    <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120zm400-600H280v520h400zM360-280h80v-360h-80zm160 0h80v-360h-80zM280-720v520z" />
                                </svg>
                            </button>
                            <button type="button" class="btn editElement" data-bs-toggle="modal" data-bs-request="PUT" data-bs-elementtype="${item.type}"
                                data-bs-elementuuid="${item.uuid}"
                                data-bs-elementvalue="${item.value}"
                                data-bs-target="#${item.type}UpdateModal">
                                <svg xmlns="http://www.w3.org/2000/svg" name="editIcon" width="24" height="24" viewBox="0 -960 960 960">
                                    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120zm160-240v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5-5.5 29.5T897-728L530-360zm481-424-56-56zM440-440h56l232-232-28-28-29-28-231 231zm260-260-29-28zl28 28z" />
                                </svg>
                            </button>
                        </div>
                        <div class="feedback-item ${item.type} ${item.isVisible ? '' : 'edit-hidden'}">
                            <div class="feedback-info media-body">
                                <div class="feedback-head">
                                    <div class="feedback-title">${(item.type == 'condition') ?
                `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-question-diamond" viewBox="0 0 16 16">
                                            <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z" />
                                            <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94" />
                                        </svg>
                                        Condition:` : ``}
                                    </div>
                                </div>
                                <div class="feedback-message">
                                    ${outputHtmlForElement(item)}
                                </div>
                            </div>
                            ${(item.elements && item.elements.length > 0) ?
                `<div class="feedback-message">
                                <p><a class="pageLink" href="/page/${item.uuid}/edit">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-question-diamond" viewBox="0 0 16 16">
                                        <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z" />
                                        <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94" />
                                    </svg>: ${item.elements.length}
                                </a></p>
                            </div >` : ''}
                        </div>
                    </div>
             </div>`;
        return html;
    }

    function assemblePageEntry(item) {
        let html =
            `<div class="content-chunk">
                <div class="drag-handle">::</div>
            <div data-uuid="${item.uuid}" class="feedback-item item-list media-list">
            <div class="editButtons">
                <button type="button" data-bs-uuid="${item.uuid}" data-bs-toggle="modal" data-bs-toggle="${item.type}" data-bs-elementtype="${item.type}" data-bs-target="#pageDeleteModal" class="btn item-delete-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" name="deleteIcon" width="24" height="24" viewBox="0 -960 960 960">
                        <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120zm400-600H280v520h400zM360-280h80v-360h-80zm160 0h80v-360h-80zM280-720v520z" />
                    </svg>
                </button>
                <button type="button" class="btn editElement" data-bs-toggle="modal" data-bs-request="PUT" data-bs-elementtype="${item.type}"
                    data-bs-elementuuid="${item.uuid}" data-bs-elementvalue="${item.value}"
                    data-bs-target="#${item.type}UpdateModal">
                    <svg xmlns="http://www.w3.org/2000/svg" name="editIcon" width="24" height="24" viewBox="0 -960 960 960">
                        <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120zm160-240v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5-5.5 29.5T897-728L530-360zm481-424-56-56zM440-440h56l232-232-28-28-29-28-231 231zm260-260-29-28zl28 28z" />
                    </svg>
                </button>
            </div>
            <div class="feedback-item ${item.type}">
                <div class="feedback-info media-body">
                    <div class="feedback-head">
                        <div class="feedback-title">${item.value}</div>
                        ${(item.elements && item.elements.filter(el => el.type == 'text').length > 0) ? `<div class="pageIcon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                                class="bi bi-type" viewBox="0 0 16 16">
                                <path
                                    d="m2.244 13.081.943-2.803H6.66l.944 2.803H8.86L5.54 3.75H4.322L1 13.081zm2.7-7.923L6.34 9.314H3.51l1.4-4.156zm9.146 7.027h.035v.896h1.128V8.125c0-1.51-1.114-2.345-2.646-2.345-1.736 0-2.59.916-2.666 2.174h1.108c.068-.718.595-1.19 1.517-1.19.971 0 1.518.52 1.518 1.464v.731H12.19c-1.647.007-2.522.8-2.522 2.058 0 1.319.957 2.18 2.345 2.18 1.06 0 1.716-.43 2.078-1.011zm-1.763.035c-.752 0-1.456-.397-1.456-1.244 0-.65.424-1.115 1.408-1.115h1.805v.834c0 .896-.752 1.525-1.757 1.525" />
                            </svg>
                            <div>
                                ${item.elements.filter(el => el.type == 'text').length}
                            </div>
                        </div>` : ''}
                        ${(item.elements && item.elements.filter(el => el.type == 'image').length > 0) ? `<div class="pageIcon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                                class="bi bi-image" viewBox="0 0 16 16">
                                <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
                                <path
                                    d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z" />
                            </svg>
                            <div>
                                ${item.elements.filter(el => el.type == 'image').length}
                            </div>
                        </div>` : ''}
                        ${(item.elements && item.elements.filter(el => el.type == 'choice').length > 0) ? `<div class="pageIcon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">
                                <path
                                    d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z" />
                                <path
                                    d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z" />
                            </svg>
                            <div>

                                ${item.elements.filter(el => el.type == 'choice').length}

                            </div>
                        </div>` : ''}
                    </div>
                    <div class="feedback-message">
                        ${outputHtmlForElement(item)}
                    </div>
                </div>
            </div>
        </div></div></div>`;
        return html;
    }

    let allPageUUIDs = [];

    async function updateDisplay(data) {
        allPageUUIDs = data.pageData[0].elements.map(p => p.uuid);

        // console.log("---updateDisplay - allPageUUIDs? ", allPageUUIDs);
        $('.toast').toast();
        const render = [];
        let assembledHTML = "";
        // Reset all error or success status messages
        $('.feedback-status').empty();
        console.log("---Calling updateDisplay() - data errors and story? ", data);
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

            assembledHTML = '';
            // assembledHTML = '<div id="draggableList" class="list-group feedback-items">';
            render.push(assembledHTML);
            //rebuilding the elements and buttons
            $.each(page, function createHtml(key, item) {
                // console.log("-----type? ", item);
                assembledHTML = '';
                if (item.type == "page") {
                    //assemble HTML with functions to match what is shown on storyPage.ejs - need a better way to do this
                    assembledHTML += assemblePageEntry(item);
                } else {
                    assembledHTML += assembleElementEntry(item);
                }
                render.push(assembledHTML);
            });
            assembledHTML = '</div>';
            render.push(assembledHTML);
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
                            updateDisplay(story);
                        },
                        error: function (xhr, status, error) {
                            // Handle errors, e.g., display error message
                            console.error('Deletion failed:', error);
                            //console.log('Server response:', xhr.responseText);
                        },
                        complete: function (story) {
                            // console.log("---COMPLETE");
                            // updateDisplay(story);
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
                    updateDisplay(story);
                },
                error: function (xhr, status, error) {
                    // Handle errors, e.g., display error message
                    console.error('Deletion failed:', error);
                    console.log('Server response:', xhr.responseText);
                },
                complete: function (story) {
                    // console.log("---COMPLETE");
                    //updateDisplay(response.responseJSON);
                    $('#pageDeleteModal').modal('hide');
                }
            });
        });

        $('#pageDeleteModal').on('show.bs.modal', function (event) {
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
                    let values = parseConditionString(el_value);
                    document.getElementById('modalconditionInput').value = values[0];
                    document.getElementById('conditionComparisonModal').value = values[1];
                    document.getElementById('modalconditionInput2').value = values[2];
                    break;
                case "event":
                    let eValues = el_value.split("_");
                    let eType = eValues[0];
                    document.getElementById('modaleventInput').value = eValues[1];
                    document.getElementById('eventComparisonModal').value = eValues[2];
                    document.getElementById("modaleventInput2").value = eValues[3];
                    const radios = document.getElementsByName("eventType"); // Get all radio buttons with the specified name
                    for (let i = 0; i < radios.length; i++) {
                        if (radios[i].value === eType) {
                            radios[i].checked = true;
                            break; // Exit the loop once the desired radio button is found and checked
                        }
                    }

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
                    updateDisplay(data);
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
                    updateDisplay(data);
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
        //used for when users browse their hard drive for an image and select it to add
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

    //this function is called for submitting both regular images or AI-generated images
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

        //FIRST FETCH REQUEST
        //if the form submitted is from regular local images, generate the img copy and return the file path
        if (e.target.id == "uploadFormModal") {
            imgPath = await createLocalImgUploadPath(formData);
        } else if (e.target.id == "uploadImageFormModal_AI") {
            imgPath = formData.get("imagepath_ai");
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
                    updateDisplay(data);
                },
                complete: function () {
                    if (e.target.id == "uploadFormModal") {
                        $('.elementModal').modal('hide');
                    } else if (e.target.id == "uploadImageFormModal_AI") {
                        aiForm_reset();
                        $('.elementAiModal').modal('hide');
                    }


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
                    updateDisplay(data);
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
                    //run the second process for creating or updating the choice link
                    runSecondRequest(possibleNewDestinationUUID);
                },
                complete: function () {
                    // $(`.elementModal`).modal('hide');
                }
            });
        } else {
            console.log("----we are NOT creating a new page with the new choice!");
            possibleNewDestinationUUID = formData.get("destinationModal");
            //run the second process for creating or updating or creating the choice link
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
                        updateDisplay(data);
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
                        updateDisplay(data);
                    },
                    complete: function () {
                        $(`.elementModal`).modal('hide');
                    }
                });


            }
        }

    });

    const eventForm = document.getElementById("eventFormModal");
    eventForm.addEventListener("submit", function (e) {
        // Prevent the default submit form event
        e.preventDefault();
        console.log("-----event FORM SUBMIT FROM MODAL");

        const formData = new FormData(eventForm);

        for (const pair of formData.entries()) {
            console.log(pair[0], ":", pair[1]);
        }

        let possibleNewDestinationUUID;

        //we have to put this in a function so that it doesn't attempt to run before the page is created with a new ID

        let assembledData = {
            uuid: formData.get("hiddeneventuuid"),
            newDataObj: {
                occurs: formData.get('eventType'),
                property: formData.get('modaleventInput'),
                operator: formData.get('eventComparisonModal'),
                amount: formData.get('modaleventInput2'),
                value: `${formData.get('eventType')}_${formData.get('modaleventInput')}_${formData.get('eventComparisonModal')}_${formData.get('modaleventInput2')}`,
                html: `<strong><svg xmlns="http://www.w3.org/2000/svg" width="24"
                                    height="24" fill="currentColor" viewBox="0 -960 960 960">
                                    <path
                                        d="M480-280q17 0 28.5-11.5T520-320t-11.5-28.5T480-360t-28.5 11.5T440-320t11.5 28.5T480-280m-40-160h80v-240h-80zm40 412L346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140zm0-340" />
                                </svg>  Custom ${formData.get('eventType')} event: ${formData.get('modaleventInput')}${formData.get('eventComparisonModal')}${formData.get('modaleventInput2')} </strong>`
            }
        }
        console.log("----SENDING ASSEMBLED DATA...");
        console.log(assembledData);

        if (formData.get("eventrequest") == "POST") {
            console.log("----creating new content");

            // XHR POST request
            $.ajax({
                url: '/page/api',
                type: 'POST',
                // Gather all data from the form and create a JSON object from it
                data: {
                    uuid: formData.get("hiddeneventuuid"),
                    section: formData.get("section"),
                    type: `event`,
                    occurs: formData.get('eventType'),
                    property: formData.get('modaleventInput'),
                    operator: formData.get('eventComparisonModal'),
                    amount: formData.get('modaleventInput2'),
                    value: `${formData.get('eventType')}_${formData.get('modaleventInput')}_${formData.get('eventComparisonModal')}_${formData.get('modaleventInput2')}`,
                    html: `<strong><svg xmlns="http://www.w3.org/2000/svg" width="24"
                                    height="24" fill="currentColor" viewBox="0 -960 960 960">
                                    <path
                                        d="M480-280q17 0 28.5-11.5T520-320t-11.5-28.5T480-360t-28.5 11.5T440-320t11.5 28.5T480-280m-40-160h80v-240h-80zm40 412L346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140zm0-340" />
                                </svg>  Custom ${formData.get('eventType')} event: ${formData.get('modaleventInput')}${formData.get('eventComparisonModal')}${formData.get('modaleventInput2')} </strong>`
                },
                success: function (data) {
                    console.log("----WE SUBMITTED eventS FROM THE MODAL");
                    console.log(data);
                    $('#myChoiceToast').toast('show');
                    updateDisplay(data);
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
                    updateDisplay(data);
                },
                complete: function () {
                    $(`.elementModal`).modal('hide');
                }
            });


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
                    updateDisplay(data);
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
                    updateDisplay(data);
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
                    updateDisplay(data);
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
                    newDataObj: { title: formData.get("modalpageInput"), value: formData.get("modalpageInput") }
                },
                success: function (data) {
                    console.log("----WE UPDATED PAGE FROM THE MODAL");
                    console.log(data);
                    updateDisplay(data);
                },
                complete: function () {
                    $(`.elementModal`).modal('hide');
                }
            });

        }

    });

    function parseConditionString(str) {
        console.log("---parseCondition ", str);
        str = str.replace(/&gt;/gi, '>')
            .replace(/&lt;/gi, '<')
            .replace(/&amp;/gi, '&')
            .replace(/&equals;/gi, '=');

        console.log("---parseCondition ", str);

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
                console.log(`Found match, group ${groupIndex}: ${match}`);
            });

            result = [m[1], m[2], m[3]];
        }

        return result;
    }

});