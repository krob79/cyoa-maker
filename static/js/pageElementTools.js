console.log("--------loading pageElementTools.js!");
//this is JS that is loaded from a script tag at the bottom of each story page

//for choice input
const choiceForm = document.getElementById("choiceForm");

//for img uploads
const fileInput = document.getElementById('fileInput');

const resultDiv = document.getElementById('result');


function updateTextElementValue(e) {
  console.log("----update input: ", e);
  const elValue = document.getElementById("elementValue");
  // elValue.value = e.target.value;
}

function changeChoiceDestination(display = null) {
  console.log("calling changeChoiceDestination()");
  let choiceDropdown = document.getElementById('choiceDestination');
  let destination = document.getElementById("destination");


  if (display) {
    destination.value = display;
  } else {
    destination.value = choiceDropdown.value
  }
  console.log(choiceDropdown);
  if (destination.value == "Choose Page") {
    document.getElementById("choiceElementSubmit").disabled = true;
  } else {
    document.getElementById("choiceElementSubmit").disabled = false;
  }
}
changeChoiceDestination("Choose Page");

function changeChoiceDestinationModal(display = null) {

  let dropdown = document.getElementById('choiceDestinationModal');
  let hiddenchoiceuuid = document.getElementById("hiddenchoiceuuid");
  let choiceDestination = document.getElementById("choiceDestinationModal");


  if (display) {
    choiceDestination.value = display;
  } else {
    choiceDestination.value = dropdown.value
  }

  console.log("calling changeChoiceDestinationModal() ", dropdown.value);
  // console.log(choiceDropdown);
  // if (destination.value == "Choose Page") {
  //   document.getElementById("choiceElementSubmit").disabled = true;
  // } else {
  //   document.getElementById("choiceElementSubmit").disabled = false;
  // }
}

function changeElement(display = null) {
  // const feedbackStatus = document.getElementsByClassName("feedback-status")[0];
  // feedbackStatus.innerHTML = "";

  const dropdown = document.getElementById("storyElementPicker");
  let forms = Array.from(document.getElementsByClassName("form-group"));

  for (let i = 0; i < forms.length; i++) {
    console.log(forms[i].id);
    if (forms[i].id === dropdown.value || forms[i].id === display) {
      forms[i].style.display = "block";
    } else {
      forms[i].style.display = "none";
    }
  }
}

// changeElement("element-text");


fileInput.addEventListener('change', (e) => {
  console.log("--filereader change");
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    const preview = document.getElementById('preview');
    reader.onload = () => {
      preview.src = reader.result;
      //console.log(`---Preview: `, file);

      // hiddenElementValue.value = file.name;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    preview.style.display = 'none';
    preview.src = '';
  }
});

modalimageInput.addEventListener('change', (e) => {
  console.log("--filereader modal change");
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    const preview = document.getElementById('previewModal');
    reader.onload = () => {
      preview.src = reader.result;
      //console.log(`---Preview in modal: `, file);
      // hiddenElementValue.value = file.name;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    preview.style.display = 'none';
    preview.src = '';
  }
});




