console.log("----deletehandlers.js");

import { updateDisplay } from './render.js'; // your renderer rebinds buttons & refreshes DOM

export function initializeDeleteButtons() {
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

export function initializeDeleteButtonFromModal() {
    //code for button inside the Delete Modal that actually starts the delete process
    const deletePageFromModalBtn = document.getElementById('deletePageFromModalBtn');
    deletePageFromModalBtn?.addEventListener('click', function (evt) {
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