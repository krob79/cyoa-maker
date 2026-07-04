let svg = document.getElementById("zoneSvg");
let svgImage = document.getElementById("svgImage");
let completedZones = document.getElementById("completedZones");
let activeFill = document.getElementById("activeFill");
let activeLine = document.getElementById("activeLine");
let previewLine = document.getElementById("previewLine");
let pointMarkers = document.getElementById("pointMarkers");

let imageUrlInput = document.getElementById("imageUrlInput");
let loadImageBtn = document.getElementById("loadImageBtn");
let finishZoneBtn = document.getElementById("finishZoneBtn");
let undoBtn = document.getElementById("undoBtn");
let cancelZoneBtn = document.getElementById("cancelZoneBtn");
let deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
let clearAllBtn = document.getElementById("clearAllBtn");

let zoneList = document.getElementById("zoneList");
let htmlOutput = document.getElementById("htmlOutput");
let jsonOutput = document.getElementById("jsonOutput");
let previewImage = document.getElementById("previewImage");
let customMap = document.getElementById("customMap");

const SVG_NS = "http://www.w3.org/2000/svg";

let imageNaturalWidth = 0;
let imageNaturalHeight = 0;
let currentZone = createEmptyZone();
let zones = [];
let selectedZoneId = null;
let pointerMoved = false;
let lastPointerPosition = null;

loadImage(imageUrlInput.value);

loadImageBtn.addEventListener("click", () => {
  loadImage(imageUrlInput.value.trim());
});

finishZoneBtn.addEventListener("click", finishCurrentZone);
undoBtn.addEventListener("click", undoLastPoint);
cancelZoneBtn.addEventListener("click", cancelCurrentZone);
deleteSelectedBtn.addEventListener("click", deleteSelectedZone);
clearAllBtn.addEventListener("click", clearAllZones);

window.addEventListener("resize", renderAll);

svg.addEventListener("pointerdown", event => {
  if (!imageNaturalWidth || !imageNaturalHeight) return;

  pointerMoved = false;
  svg.setPointerCapture(event.pointerId);
});

svg.addEventListener("pointermove", event => {
  if (!imageNaturalWidth || !imageNaturalHeight) return;

  pointerMoved = true;
  lastPointerPosition = getSvgPoint(event);
  renderPreviewLine();
});

svg.addEventListener("pointerup", event => {
  if (!imageNaturalWidth || !imageNaturalHeight) return;

  const target = event.target;

  if (target.classList.contains("completed-zone")) {
    selectedZoneId = target.dataset.zoneId;
    renderAll();
    return;
  }

  if (target.classList.contains("first-point-marker") && currentZone.points.length >= 3) {
    finishCurrentZone();
    return;
  }

  // Ignore accidental drags on touch/pen/mouse.
  if (pointerMoved && event.pointerType !== "mouse") return;

  addPoint(getSvgPoint(event));
});

svg.addEventListener("dblclick", event => {
  event.preventDefault();
  finishCurrentZone();
});

document.addEventListener("keydown", event => {
  const activeElement = document.activeElement;
  const isTyping = activeElement && ["INPUT", "TEXTAREA"].includes(activeElement.tagName);

  if (isTyping) return;

  if (event.key === "Enter") {
    event.preventDefault();
    finishCurrentZone();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    cancelCurrentZone();
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    if (currentZone.points.length > 0) {
      undoLastPoint();
    } else {
      deleteSelectedZone();
    }
  }
});

function loadImage(url) {
  if (!url) return;

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    imageNaturalWidth = img.naturalWidth;
    imageNaturalHeight = img.naturalHeight;

    svg.setAttribute("viewBox", `0 0 ${imageNaturalWidth} ${imageNaturalHeight}`);
    svgImage.setAttribute("href", url);
    svgImage.setAttribute("width", imageNaturalWidth);
    svgImage.setAttribute("height", imageNaturalHeight);

    previewImage.src = url;

    currentZone = createEmptyZone();
    zones = [];
    selectedZoneId = null;
    lastPointerPosition = null;
    renderAll();
  };

  img.onerror = () => {
    alert("The image could not be loaded. Try another image URL or local path.");
  };

  img.src = url;
}

function createEmptyZone() {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `zone-${Date.now()}-${Math.random()}`,
    label: "",
    href: "#",
    alt: "",
    title: "",
    points: []
  };
}

function addPoint(rawPoint) {
  const point = clampPoint({
    x: Math.round(rawPoint.x),
    y: Math.round(rawPoint.y)
  });

  currentZone.points.push(point);
  selectedZoneId = null;
  renderAll();
}

function finishCurrentZone() {
  if (currentZone.points.length < 3) {
    alert("A polygon zone requires at least three points.");
    return;
  }

  const zoneNumber = zones.length + 1;

  zones.push({
    ...currentZone,
    label: currentZone.label || `Zone ${zoneNumber}`,
    alt: currentZone.alt || `Zone ${zoneNumber}`,
    title: currentZone.title || `Zone ${zoneNumber}`,
    points: currentZone.points.map(point => ({ ...point }))
  });

  currentZone = createEmptyZone();
  lastPointerPosition = null;
  renderAll();
}

function undoLastPoint() {
  if (currentZone.points.length === 0) return;

  currentZone.points.pop();
  renderAll();
}

function cancelCurrentZone() {
  currentZone = createEmptyZone();
  lastPointerPosition = null;
  renderAll();
}

//removes a specific zone object from the zones array
function deleteSelectedZone() {
  if (!selectedZoneId) return;

  zones = zones.filter(zone => zone.id !== selectedZoneId);
  selectedZoneId = null;
  renderAll();
}

//removes all stored zone objects from the zones array
function clearAllZones() {
  currentZone = createEmptyZone();
  zones = [];
  selectedZoneId = null;
  lastPointerPosition = null;
  renderAll();
}

//returns SVGPoint object with X and Y coordinates relative to inside the SVG viewBox
function getSvgPoint(event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;

  const result = point.matrixTransform(svg.getScreenCTM().inverse());
  return result;
}

//establishes bounds so that the point never drops below zero or exceeds the image's natural width or height
function clampPoint(point) {
  return {
    x: Math.min(Math.max(point.x, 0), imageNaturalWidth),
    y: Math.min(Math.max(point.y, 0), imageNaturalHeight)
  };
}

function renderAll() {
  renderCompletedZones();
  renderActiveZone();
  renderPreviewLine();
  renderZoneList();
  updateButtons();
  updateOutput();
  updateImageMapPreview();
}

function renderCompletedZones() {
  completedZones.innerHTML = "";

  zones.forEach(zone => {
    console.log(zone.points);
    const polygon = document.createElementNS(SVG_NS, "polygon");
    polygon.setAttribute(
      "class",
      zone.id === selectedZoneId ? "completed-zone is-selected" : "completed-zone"
    );
    polygon.setAttribute("points", pointsToSvgString(zone.points));
    polygon.dataset.zoneId = zone.id;

    completedZones.appendChild(polygon);
  });
}

function renderActiveZone() {
  const points = currentZone.points;
  activeLine.setAttribute("points", pointsToSvgString(points));
  activeFill.setAttribute("points", points.length >= 3 ? pointsToSvgString(points) : "");

  pointMarkers.innerHTML = "";

  points.forEach((point, index) => {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute(
      "class",
      index === 0 ? "point-marker first-point-marker" : "point-marker"
    );
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", 7);

    pointMarkers.appendChild(circle);
  });
}

function renderPreviewLine() {
  const points = currentZone.points;

  if (points.length === 0 || !lastPointerPosition) {
    previewLine.style.display = "none";
    return;
  }

  const lastPoint = points[points.length - 1];
  const pointerPoint = clampPoint({
    x: Math.round(lastPointerPosition.x),
    y: Math.round(lastPointerPosition.y)
  });

  previewLine.style.display = "block";
  previewLine.setAttribute("x1", lastPoint.x);
  previewLine.setAttribute("y1", lastPoint.y);
  previewLine.setAttribute("x2", pointerPoint.x);
  previewLine.setAttribute("y2", pointerPoint.y);
}

function renderZoneList() {
  zoneList.innerHTML = "";

  if (zones.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No completed zones yet.";
    zoneList.appendChild(item);
    return;
  }

  zones.forEach((zone, index) => {
    const item = document.createElement("li");
    const isSelected = zone.id === selectedZoneId;
    item.innerHTML = `<strong>${zone.label || `Zone ${index + 1}`}</strong> — ${zone.points.length} points${isSelected ? " — selected" : ""}`;

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.textContent = "Select";
    selectBtn.addEventListener("click", () => {
      selectedZoneId = zone.id;
      renderAll();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      zones = zones.filter(existingZone => existingZone.id !== zone.id);
      if (selectedZoneId === zone.id) selectedZoneId = null;
      renderAll();
    });

    item.append(selectBtn, deleteBtn);
    zoneList.appendChild(item);
  });
}

function updateButtons() {
  finishZoneBtn.disabled = currentZone.points.length < 3;
  undoBtn.disabled = currentZone.points.length === 0;
  cancelZoneBtn.disabled = currentZone.points.length === 0;
  deleteSelectedBtn.disabled = !selectedZoneId;
  clearAllBtn.disabled = zones.length === 0 && currentZone.points.length === 0;
}

function updateOutput() {
  if (zones.length === 0) {
    htmlOutput.value = "";
    jsonOutput.value = "";
    return;
  }

  const areaTags = zones.map((zone, index) => {
    const label = zone.label || `Zone ${index + 1}`;
    const href = zone.href || `#zone-${index + 1}`;
    const alt = zone.alt || label;
    const title = zone.title || label;

    return `  <area shape="poly" coords="${pointsToCoordsString(zone.points)}" href="${escapeHtmlAttribute(href)}" alt="${escapeHtmlAttribute(alt)}" title="${escapeHtmlAttribute(title)}">`;
  });

  htmlOutput.value = `<map name="customMap">\n${areaTags.join("\n")}\n</map>`;

  jsonOutput.value = JSON.stringify({
    image: {
      src: imageUrlInput.value.trim(),
      width: imageNaturalWidth,
      height: imageNaturalHeight
    },
    zones: zones.map((zone, index) => ({
      id: zone.id,
      label: zone.label || `Zone ${index + 1}`,
      href: zone.href || `#zone-${index + 1}`,
      alt: zone.alt || `Zone ${index + 1}`,
      title: zone.title || `Zone ${index + 1}`,
      coords: pointsToCoordsString(zone.points),
      points: zone.points
    }))
  }, null, 2);
}

function scaleZoneCoords(zones) {
  let originalW = parseInt(svgImage.getAttribute('width'));
  let scaledW = previewImage.width;
  let percentage = (scaledW / originalW);
  console.log(`----PERCENTAGE IS ${percentage}`);
  console.log(`---SVG Image: ${svgImage.getAttribute('width')} x ${svgImage.getAttribute('height')}`);
  console.log(`---Preview Image: ${previewImage.width}x${previewImage.height}`)
  let scaledZones = zones.map((zone, index) => {
    console.log("---");
    console.log(zone);
    let newPoints = zone.points.map((p) => {
      //console.log(`---wtf is this? `);
      //console.log(p);
      return (
        { x: Math.round(p.x * percentage), y: Math.round(p.y * percentage) }
      );
    });
    let newZone = {
      ...zone,
      points: newPoints

    }
    return newZone;
  });

  console.log("---SCALED ZONES:");
  console.log(scaledZones);
  return scaledZones;

}

function updateImageMapPreview() {
  let scaledZones = scaleZoneCoords(zones);

  customMap.innerHTML = "";

  scaledZones.forEach((zone, index) => {
    const label = zone.label || `Zone ${index + 1}`;
    const area = document.createElement("area");
    area.shape = "poly";
    area.coords = pointsToCoordsString(zone.points);
    area.href = zone.href || `#zone-${index + 1}`;
    area.alt = zone.alt || label;
    area.title = zone.title || label;

    area.addEventListener("click", event => {
      event.preventDefault();
      selectedZoneId = zone.id;
      renderAll();
      alert(`Clicked ${label}`);
    });

    customMap.appendChild(area);
  });
}

function pointsToSvgString(points) {
  return points.map(point => `${point.x},${point.y}`).join(" ");
}

function pointsToCoordsString(points) {
  return points.map(point => `${point.x},${point.y}`).join(",");
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
