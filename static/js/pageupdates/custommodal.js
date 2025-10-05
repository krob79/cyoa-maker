// console.log("---loading modal.js!");

const content = document.querySelector('#undumcontainer');
content.addEventListener("click", () => {
    console.log("clicked on modal");
})

content.addEventListener('modalevent', function (e) {

    //{desc:Description here, }
    let isItem = false;

    let modalDiv = document.createElement('div');
    modalDiv.classList.add('custommodal');
    modalDiv.setAttribute('id', 'myModal');

    let modalContent = document.createElement('div');
    modalContent.classList.add('custommodal-content');

    let modalImageDiv = document.createElement('div');
    modalContent.appendChild(modalImageDiv);

    let modalButtonSpace = document.createElement('div');
    modalButtonSpace.classList.add('custommodal-btn-space');

    let modalClose = document.createElement('span');
    modalClose.classList.add('custommodal-btn');
    modalClose.innerHTML = `OK`;

    //title is optional
    if (e.detail.title) {
        let modalTitleDiv = document.createElement('div');
        modalTitleDiv.classList.add('custommodal-title-div');
        let modalTitle = document.createElement('span');
        modalTitle.classList.add('custommodal-title');
        modalTitle.innerHTML = e.detail.title;
        modalTitleDiv.appendChild(modalTitle);
        modalDiv.appendChild(modalTitleDiv);
    }

    const modalImage = new Image();
    if (e.detail.image) {
        try {
            modalImage.src = `/uploads/${e.detail.image}`;
        } catch (error) {
            console.log("------WTF");
        }

    }

    //image is optional - but indicates an item or something to investigate
    modalImage.onload = () => {
        // if (e.detail.image) {
        console.log("-----image source is: ", e.detail.image);

        isItem = true;

        // let modalImage = document.createElement('img');

        // modalImage.setAttribute('src', `/uploads/${e.detail.image}`);
        if (e.detail.action == 'look') {
            modalImage.classList.add('custommodal-image-look');
        } else {
            modalImage.classList.add('custommodal-image-take');
        }

        modalImageDiv.classList.add('custommodal-image-div');
        modalImageDiv.appendChild(modalImage);

    }

    modalImage.onerror = () => {
        console.log("-------COULD NOT FIND IMAGE FOR MODAL");
    }

    let modalText = document.createElement('div');
    modalText.classList.add('custommodal-text');
    modalText.innerHTML = e.detail.desc;

    //example: {evtname:'promptevent', detail:{promptType:'input', action:'create', promptText:'Who the heck are you, anyway?', processNode:'1112', cancelNode:'1113', value:'gameplayer.name'}}
    //example: {evtname:'promptevent', detail:{promptType:'compare', action:'create', promptText:'What is the secret password?', objString: [{value:'betty.password',resultNode:'1118'},{value:'poop',resultNode:'1121'},{value:'shit',resultNode:'1121'}], defaultNode:'1119', cancelNode: '1120'}}
    //example: {evtname:'modalevent', detail: {title:`New Item Added: ${item.title}`,desc:`${item.desc}`,image:`item-${item.id}.png`}}

    //if there is a prompt in the modalEvent, we will add an input field, a submit button, and a cancel button
    if (e.detail.prompt) {
        //create input field with prompt text
        let prompt = document.createElement('input');
        prompt.classList.add('promptinput');
        prompt.setAttribute('id', 'prompt');
        prompt.setAttribute('name', 'answer');
        prompt.setAttribute('placeholder', 'Type Your Answer');

        let promptlabel = document.createElement('label');
        promptlabel.setAttribute('for', 'prompt');
        promptlabel.setAttribute('value', 'promptlabel');
        promptlabel.innerHTML = `<p>${e.detail.desc}</p>`;
        modalContent.appendChild(promptlabel);
        modalContent.appendChild(prompt);

        let modalSubmit = document.createElement('div');
        modalSubmit.classList.add('custommodal-btn');
        modalSubmit.innerHTML = `Submit`;
        modalSubmit.onclick = function () {
            console.log(`---submitting input from button ${e.detail.prompt.objString} `);
            if (e.detail.prompt.objString) {
                content.dispatchEvent(new CustomEvent('changenode', { detail: { destination: comparePrompt(e.detail) } }));
            } else {
                processPrompt(e.detail.prompt);
                choiceDispatchEvent(0);
            }

            modalDiv.style.display = "none";
        }

        //change the "OK" button to say "Cancel" instead
        modalClose.innerHTML = `Cancel`;

        modalButtonSpace.appendChild(modalSubmit);
    }

    //option where you can examine item before taking it
    if (e.detail.action == 'look') {
        let modalTakeBtn = document.createElement('span');
        modalTakeBtn.classList.add('custommodal-btn');
        modalTakeBtn.innerHTML = `Take It`;
        modalTakeBtn.onclick = function () {
            //console.log(`---submitting input from button ${e.detail.prompt.objString} `);
            modalDiv.style.display = "none";
            //evtname:'itemevent', detail:{id: "fruitsamsam", title: "Fruit Samsam", desc: "A lovely fried pastry filled with fruit.", amount:1}}
            //content.dispatchEvent(new CustomEvent(e.detail.event.name, {e.detail.event.detail}));
        }

        //change the "OK" button to say "Leave It" instead
        modalClose.innerHTML = `Leave It`;

        modalButtonSpace.appendChild(modalTakeBtn);

    }

    modalContent.appendChild(modalText);
    modalDiv.appendChild(modalContent);
    modalButtonSpace.appendChild(modalClose);
    modalContent.appendChild(modalButtonSpace);

    // Get the modal
    var modal = document.getElementById("myModal");

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    modalDiv.style.display = "block";

    console.log(`---modal event heard! DISPLAY: ${modalDiv.style.display}`);

    // When the user clicks on <span> (x), close the modal
    modalClose.onclick = function () {
        console.log("---closing modal from button");
        //not sure if this code is what needs to be here...but it seems to work for now

        if (e.detail.prompt) {
            choiceDispatchEvent(1);
            removePrompt();
        }
        modalDiv.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modalDiv) {
            console.log("---closing modal from BG");
            //not sure if this code is what needs to be here...but it seems to work for now
            if (e.detail.prompt) {
                choiceDispatchEvent(1);
                removePrompt();
            }
            modalDiv.style.display = "none";
        }
    }

    setTimeout(function () {
        content.appendChild(modalDiv);
        if (e.detail.confetti || isItem) {
            if (isItem) {
                party.sparkles(modalContent, { count: party.variation.range(10, 20), shapes: ["star"] });
            } else {
                party.confetti(modalContent, { count: party.variation.range(80, 100) });
            }

        }

    }, 1000);

});

function createImageElement(src, parentElement) {
    const img = new Image(); // Create a new Image object

    img.onload = () => {
        // Image loaded successfully, append it to the DOM
        parentElement.appendChild(img);
        console.log(`Image loaded: ${src}`);
    };

    img.onerror = () => {
        // Image failed to load (e.g., 404 Not Found)
        console.error(`Image failed to load: ${src}`);
        // You can optionally display a placeholder image or handle the error in another way
    };

    img.src = src; // Set the src attribute to start loading the image
}

// console.log("---firing event!");
export function alertItem(title, desc, img) {
    content.dispatchEvent(new CustomEvent('modalevent', { detail: { title: `New Item: ${title}`, desc: `${desc}`, image: `item-${img}.png` } }));
}
