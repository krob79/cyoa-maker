import { findUuidInURL } from './dragdrop.js';
import { initializeDeleteButtons, initializeDeleteButtonFromModal } from './deleteHandlers.js';
// import inventory from '../services/inventory.js';

console.log("----render.js");

let allPageUUIDs = [];
// cache the template text so we fetch once
let ENTRY_TPL_TEXT = null;

function initializeUserEventLinks() {
  let userEvts = Array.from(document.querySelectorAll('.userevent'));
  userEvts.forEach((el) => {
    console.log("--user event: ", el.textContent.trim());
    el.addEventListener("click", (e) => {
      let txt = el.textContent.trim();
      let parent = e.target.parentNode.parentNode
      console.log("---parent: ", parent);
      parseInventoryString(e.target.dataset.event);
      let textNode = document.createTextNode(txt);
      parent.replaceChild(textNode, e.target.parentNode);
      // e.target.removeEventListener("click");
    });
  })

}

initializeUserEventLinks();

function parseInventoryString(str) {
  $.ajax({
    url: '/inventory/parse',
    type: 'POST',
    contentType: 'application/json; charset=UTF-8',
    // Gather all data from the form and create a JSON object from it
    data: JSON.stringify({ str }),
    success: function (data) {
      console.log("----event success!");
      console.log("----new data: ", data);
    },
    complete: function () {
      console.log("---event complete");
    },
  });

}



//for using the EJS template in CSR and SSR
async function getEntryTemplate() {
  if (!ENTRY_TPL_TEXT) {
    const res = await fetch('/templates/entry.ejs');
    console.log("----LOADING EJS TEMPLATE: ", res);
    ENTRY_TPL_TEXT = await res.text();
  }
  return ENTRY_TPL_TEXT;
}
//for using the EJS template in CSR and SSR
//keep assembleEntry function as a fallback in case the loading of EJS entry doesn't work
async function renderEntries(items) {
  try {
    const tpl = await getEntryTemplate();
    return items.map(item => ejs.render(tpl, { item })).join('');
    console.log("---EJS Template imported successfully!");
  } catch {
    // fallback to JS builder
    console.log("---EJS Template failed to import!");
    return items.map(item => assembleEntry(item)).join('');
  }
}

export function verifyUUID(uuid) {
  return allPageUUIDs.includes(uuid);
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

export async function reorderElements({ from, to }) {
  // console.log(`---calling reorderElements!! ${from} - ${to}`);
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
    // console.log("----HERE's the newDataObj to be submitted");
    // console.log(myNewDataObj);

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
        // console.log("----WE SUBMITTED REORDERED ELEMENTS!!");
        // console.log(data);
        updateDisplay(data);
      }
    });

  } else {
    console.log("-----ERROR: NO UUID FOUND IN URL!!!");
  }

}



export async function updateDisplay(data) {
  allPageUUIDs = data.pageData[0].elements.map(p => p.uuid);

  // console.log("---updateDisplay - allPageUUIDs? ", allPageUUIDs);
  $('.toast').toast();
  const render = [];
  let assembledHTML = "";
  // Reset all error or success status messages
  $('.feedback-status').empty();
  // console.log("---Calling updateDisplay() - data errors and story? ", data);
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

    //new version using EJS template
    const html = await renderEntries(page);
    document.querySelector('.feedback-items').innerHTML = html;

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

  initializeDeleteButtons();
  initializeDeleteButtonFromModal();
  initializeUserEventLinks();
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

//only used if 
function assembleEntry(item) {
  console.log("-----assemble NEW ENTRY!!!");
  const isPage = item.type === 'page';

  // DELETE button: type='page' uses the confirmation modal; other types delete immediately
  const deleteBtnHTML = isPage
    ? `
      <button type="button"
              data-bs-uuid="${item.uuid}"
              data-bs-toggle="modal"
              data-bs-elementtype="${item.type}"
              data-bs-target="#pageDeleteModal"
              class="btn item-delete-btn">
        <svg xmlns="http://www.w3.org/2000/svg" name="deleteIcon" width="24" height="24" viewBox="0 -960 960 960">
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120zm400-600H280v520h400zM360-280h80v-360h-80zm160 0h80v-360h-80zM280-720v520z" />
        </svg>
      </button>`
    : `
      <button type="button"
              data-bs-uuid="${item.uuid}"
              class="btn item-delete-btn">
        <svg xmlns="http://www.w3.org/2000/svg" name="deleteIcon" width="24" height="24" viewBox="0 -960 960 960">
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120zm400-600H280v520h400zM360-280h80v-360h-80zm160 0h80v-360h-80zM280-720v520z" />
        </svg>
      </button>`;

  // EDIT button (same for both)
  const editBtnHTML = `
    <button type="button"
            class="btn editElement"
            data-bs-toggle="modal"
            data-bs-request="PUT"
            data-bs-elementtype="${item.type}"
            data-bs-elementuuid="${item.uuid}"
            data-bs-elementvalue="${item.value || ''}"
            data-bs-target="#${item.type}UpdateModal">
      <svg xmlns="http://www.w3.org/2000/svg" name="editIcon" width="24" height="24" viewBox="0 -960 960 960">
        <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120zm160-240v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5-5.5 29.5T897-728L530-360zm481-424-56-56zM440-440h56l232-232-28-28-29-28-231 231zm260-260-29-28zl28 28z" />
      </svg>
    </button>`;

  // Page header icons (text/image/choice counts) — only for pages:contentReference[oaicite:1]{index=1}
  const pageIconsHTML = isPage && item.elements
    ? `
      ${item.elements.filter(el => el.type === 'text').length > 0 ? `
        <div class="pageIcon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type" viewBox="0 0 16 16">
            <path d="m2.244 13.081.943-2.803H6.66l.944 2.803H8.86L5.54 3.75H4.322L1 13.081zm2.7-7.923L6.34 9.314H3.51l1.4-4.156zm9.146 7.027h.035v.896h1.128V8.125c0-1.51-1.114-2.345-2.646-2.345-1.736 0-2.59.916-2.666 2.174h1.108c.068-.718.595-1.19 1.517-1.19.971 0 1.518.52 1.518 1.464v.731H12.19c-1.647.007-2.522.8-2.522 2.058 0 1.319.957 2.18 2.345 2.18 1.06 0 1.716-.43 2.078-1.011z"/>
          </svg>
          <div>${item.elements.filter(el => el.type === 'text').length}</div>
        </div>` : ''}

      ${item.elements.filter(el => el.type === 'image').length > 0 ? `
        <div class="pageIcon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-image" viewBox="0 0 16 16">
            <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
            <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2z"/>
          </svg>
          <div>${item.elements.filter(el => el.type === 'image').length}</div>
        </div>` : ''}

      ${item.elements.filter(el => el.type === 'choice').length > 0 ? `
        <div class="pageIcon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
               fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">
            <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
            <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
          </svg>
          <div>${item.elements.filter(el => el.type === 'choice').length}</div>
        </div>` : ''}`
    : '';

  // Title area:
  const titleHTML = isPage
    ? `${item.value || ''}`
    : (item.type === 'condition'
      ? `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
               fill="currentColor" class="bi bi-question-diamond" viewBox="0 0 16 16">
            <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
            <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
          </svg>
          Condition:`
      : ``);

  // Optional nested-elements link (present in element entry when it has children):contentReference[oaicite:2]{index=2}
  const nestedLinkHTML = !isPage && item.elements && item.elements.length > 0
    ? `
      <div class="feedback-message">
        <p><a class="pageLink" href="/page/${item.uuid}/edit">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
               fill="currentColor" class="bi bi-question-diamond" viewBox="0 0 16 16">
            <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
            <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
          </svg>: ${item.elements.length}
        </a></p>
      </div>`
    : '';

  // Outer wrapper (class differences: visibility flag only used for non-pages):contentReference[oaicite:3]{index=3}
  const visibilityClass = !isPage && item.isVisible === false ? 'edit-hidden' : '';

  let html = `
    <div class="content-chunk">
      <div class="drag-handle">::</div>
      <div data-uuid="${item.uuid}" class="feedback-item item-list media-list">
        <div class="editButtons">
          ${deleteBtnHTML}
          ${editBtnHTML}
        </div>

        <div class="feedback-item ${item.type} ${visibilityClass}">
          <div class="feedback-info media-body">
            <div class="feedback-head">
              <div class="feedback-title">
                ${titleHTML}
              </div>
              ${isPage ? pageIconsHTML : ''}
            </div>

            <div class="feedback-message">
              ${outputHtmlForElement(item)}
            </div>
          </div>

          ${nestedLinkHTML}
        </div>
      </div>
    </div>
  `;

  return html;
}

