import { findUuidInURL } from './utils.js';
import { alertItem } from './custommodal.js';
import { initializeDeleteButtons, initializeDeleteButtonFromModal } from './deleteHandlers.js';

import { elementSchemas } from '../forms/elementSchemas.js';
import { renderForm } from '../forms/formRenderer.js';

console.log("----render.js");

let allPageUUIDs = [];
// cache the template text so we fetch once
let ENTRY_TPL_TEXT = null;

//Gathers all User Events and adds event listeners
function initializeUserEventLinks() {
  // console.log('*****initializeUserEventLinks');
  let userEvts = Array.from(document.querySelectorAll('.userevent'));
  userEvts.forEach((el) => {
    // console.log("--user event: ", el.textContent.trim());
    el.addEventListener("click", async (e) => {
      let txt = el.textContent.trim();
      //getting parent reference to use for replacing the link after click
      let parent = e.target.parentNode.parentNode
      // console.log("---UUID: ", e.target.dataset.uuid);
      console.log("---UUID: ", e.target);
      let response = await fetch(`/page/${e.target.dataset.uuid}/`);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const result = await response.json();

      //if the value includes "||Event", there's no destination, just an event
      //so we'll need to go one more level deep to get the actual event value
      if (result.value.includes("||Event")) {
        //get events from the choice's elements array
        let evts = result.elements.filter(el => el.type == 'event');
        //TO DO: Loop through the whole array and dispatch all events
        //TO DO: Figure out how to handle things if there are multiple events for multiple items
        parseInventoryString(evts[0].value);
      } else {
        console.log("----about to parse event: ", result.value);
        parseInventoryString(result.value);
      }
      //replace link with text element that has the same text
      const newParagraph = document.createElement("span");
      newParagraph.classList.add('usereventdone');
      let textNode = document.createTextNode(txt);
      newParagraph.appendChild(textNode);
      parent.replaceChild(newParagraph, e.target.parentNode);
    });
  })
}

function initializeNewElementButtons() {
  let btns = Array.from(document.querySelectorAll('.universalForm'));
  let form = document.getElementById("universalFormModal");
  btns.forEach((el) => {

    el.addEventListener("click", async (e) => {
      renderForm(elementSchemas.condition, form);
    });
  })

}

initializeNewElementButtons();

function initializeChoiceLinks() {
  let choiceLinks = Array.from(document.querySelectorAll('.choiceLink'));
  choiceLinks.forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      let originalURL = el.getAttribute('href');
      console.log("----originalURL: ", originalURL);
      //using fetch to get information about this choice element
      let response = await fetch(`/page/${e.target.dataset.uuid}/`);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      let choiceElement = await response.json();
      //get the elements array within this choice link - since there are now more than just conditions in here, we need to filter for events
      let elements = choiceElement.elements;
      let dispatchEventsOnClick = choiceElement.hasEvents;
      let events = elements.filter(e => e.type == "event");
      // console.log("---filtered choice events: ", events);

      console.log("---THIS IS A CHOICE LINK!!! ", e.target.dataset.uuid);
      //this is the call that looks up the choice element, finds any events nested within and then triggers them
      if (dispatchEventsOnClick) {
        console.log("----events have been turned on for this choice link!");
        $.ajax({
          url: `/page/${e.target.dataset.uuid}/event`,
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ events }),
          success: function (data) {
            console.log("---success queueing event!");
          },
          error(xhr) {
            console.error('POST failed: ', xhr.responseText);
          },
          complete: function () {
            window.location.href = originalURL;
          },
        });
      } else {
        console.log("----events have been turned OFF for this choice link!");
        window.location.href = originalURL;
      }
    });
  })

}

initializeUserEventLinks();
initializeChoiceLinks();

//sends a command to update inventory
function parseInventoryString(str) {
  let splitStr = str.split("_");
  let itemname = splitStr[1];
  $.ajax({
    url: '/inventory/parse',
    type: 'POST',
    contentType: 'application/json; charset=UTF-8',
    // Gather all data from the form and create a JSON object from it
    data: JSON.stringify({ str }),
    success: function (data) {
      console.log("----event success!");
      console.log("----new data: ", data);
      alertItem(itemname.charAt(0).toUpperCase() + itemname.slice(1), "", itemname);
    },
    complete: function () {
      console.log("---event complete");
    },
  });

}

//fetch request to retrieve value of inventory item
const getInventoryValue = async (propertyName) => {
  console.log(`----calling getInventoryValue: ${propertyName}`);

  try {
    const response = await fetch(`/inventory/?property=${propertyName}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data.result);
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
  }

};

//for using the EJS template in CSR and SSR
async function renderEntries(items, storyuuid, allPageUUIDs) {
  try {
    const res = await fetch('/page/render-entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ items, storyuuid, allPageUUIDs })
    });

    if (!res.ok) {
      throw new Error(`Render request failed: ${res.status}`);
    }

    const result = await res.json();
    return result.html;
  } catch (err) {
    console.log('---Server-side entry render failed!', err);
    // return items.map(item => assembleEntry(item)).join('');
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
  let newline;
  //grab uuid from URL and use that to load in and display data
  if (uuidInURL) {
    await fetch(`/page/${uuidInURL}`)
      .then(response => response.json())
      .then(data => {
        //console.log("-----testfetch: ");
        //console.log(data);
        elements = data.elements;
      })

    //Make deep copy of the array so that ALL nested elements are swapped as well

    let deepCopyArray = structuredClone(elements);
    // console.log("---DEEP COPY ARRAY:");
    // console.log(deepCopyArray);
    //swap the elements in the array

    deepCopyArray = moveElement(deepCopyArray, from, to);

    let myNewDataObj = { elements: deepCopyArray };
    console.log("----HERE's the newDataObj to be submitted");
    console.log(myNewDataObj);

    // XHR POST request
    $.ajax({
      url: '/page/api',
      type: 'PUT',
      contentType: 'application/json; charset=UTF-8',
      processData: false,
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
  console.log("----UPDATE DISPLAY - HERE'S CURRENT DATA:");
  console.log(data);
  allPageUUIDs = data.pageData[0].elements.map(p => p.uuid);
  let storyUuid = data.pageData[0].uuid;

  // console.log("---updateDisplay - allPageUUIDs? ");
  // console.log(allPageUUIDs);
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
    //console.log("---what's the uuid looking like?");
    //console.log(uuidInURL);
    let page;
    //grab uuid from URL and use that to load in and display data
    if (uuidInURL) {
      await fetch(`/page/${uuidInURL}`)
        .then(response => response.json())
        .then(data => {
          // console.log("-----update displays testfetch: ");
          // console.log(data.elements);
          page = data.elements;
        })

    } else {
      console.log("-----ERROR: NO UUID FOUND IN URL!!!");
    }

    //new version using EJS template
    const html = await renderEntries(page, storyUuid, allPageUUIDs);
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

  initializeChoiceLinks();
  initializeUserEventLinks();
}
