export class ImageZoneEditor {
    constructor({
        svg,
        svgImage,
        polygonLayer,
        drawingLayer,
        emptyMessage,
        finishButton,
        undoButton,
        deleteButton,
        zoneList
    }) {
        this.svg = svg;
        this.svgImage = svgImage;
        this.polygonLayer = polygonLayer;
        this.drawingLayer = drawingLayer;
        this.emptyMessage = emptyMessage;

        this.finishButton = finishButton;
        this.undoButton = undoButton;
        this.deleteButton = deleteButton;
        this.zoneList = zoneList;

        this.currentPoints = [];
        this.zones = [];
        this.selectedZoneUuid = null;

        this.svgNamespace =
            'http://www.w3.org/2000/svg';

        this.bindEvents();
        this.render();
    }

    bindEvents() {
        this.svg.addEventListener(
            'click',
            event => this.handleSvgClick(event)
        );

        this.undoButton.addEventListener(
            'click',
            () => this.undoPoint()
        );

        this.finishButton.addEventListener(
            'click',
            () => this.finishZone()
        );

        this.zoneList.addEventListener(
            'click',
            event => this.handleZoneListClick(event)
        );
    }

    async loadImage(imageSource) {
        console.log(`---loading image from ImgZoneLoader!`);
        const dimensions =
            await this.getImageDimensions(
                imageSource
            );

        this.svg.setAttribute(
            'viewBox',
            `0 0 ${dimensions.width} ${dimensions.height}`
        );

        this.svgImage.setAttribute(
            'href',
            imageSource
        );

        this.svgImage.setAttribute(
            'width',
            String(dimensions.width)
        );

        this.svgImage.setAttribute(
            'height',
            String(dimensions.height)
        );

        this.svg.style.display = 'block';
        this.emptyMessage.style.display = 'none';

        return dimensions;
    }

    getImageDimensions(imageSource) {
        return new Promise(
            (resolve, reject) => {
                const image = new Image();

                image.addEventListener(
                    'load',
                    () => {
                        resolve({
                            width: image.naturalWidth,
                            height: image.naturalHeight
                        });
                    }
                );

                image.addEventListener(
                    'error',
                    () => {
                        reject(
                            new Error(
                                'Unable to load image.'
                            )
                        );
                    }
                );

                image.src = imageSource;
            }
        );
    }

    clear({ clearZones = true } = {}) {
        this.currentPoints = [];
        this.selectedZoneUuid = null;

        if (clearZones) {
            this.zones = [];
        }

        this.svgImage.setAttribute('href', '');
        this.svgImage.setAttribute('width', '0');
        this.svgImage.setAttribute('height', '0');

        this.svg.removeAttribute('viewBox');
        this.svg.style.display = 'none';

        this.emptyMessage.style.display = 'flex';

        this.render();
    }

    setZones(zones = []) {
        this.zones = structuredClone(zones);
        this.currentPoints = [];
        this.selectedZoneUuid = null;

        this.render();
    }

    getZones() {
        return structuredClone(this.zones);
    }

    handleSvgClick(event) {
        if (!this.svg.hasAttribute('viewBox')) {
            return;
        }

        if (
            event.target.closest(
                '.image-zone-polygon'
            )
        ) {
            return;
        }

        const point =
            this.getSvgPoint(event);

        if (!point) {
            return;
        }

        this.currentPoints.push(point);
        this.renderCurrentZone();
    }

    getSvgPoint(event) {
        const point =
            this.svg.createSVGPoint();

        point.x = event.clientX;
        point.y = event.clientY;

        const matrix =
            this.svg.getScreenCTM();

        if (!matrix) {
            return null;
        }

        const transformed =
            point.matrixTransform(
                matrix.inverse()
            );

        return {
            x: transformed.x,
            y: transformed.y
        };
    }

    undoPoint() {
        this.currentPoints.pop();
        this.renderCurrentZone();
    }

    finishZone() {
        if (this.currentPoints.length < 3) {
            return;
        }

        this.zones.push({
            uuid: crypto.randomUUID(),
            points: structuredClone(
                this.currentPoints
            )
        });

        this.currentPoints = [];

        this.render();
    }

    deleteZone(zoneUuid) {
        this.zones =
            this.zones.filter(
                zone => zone.uuid !== zoneUuid
            );

        if (
            this.selectedZoneUuid === zoneUuid
        ) {
            this.selectedZoneUuid = null;
        }

        this.render();
    }

    handleZoneListClick(event) {
        const deleteButton =
            event.target.closest(
                '[data-delete-zone-uuid]'
            );

        if (!deleteButton) {
            return;
        }

        this.deleteZone(
            deleteButton.dataset.deleteZoneUuid
        );
    }

    render() {
        this.renderCurrentZone();
        this.renderCompletedZones();
        this.renderZoneList();
    }

    renderCurrentZone() {
        this.drawingLayer.replaceChildren();

        if (
            this.currentPoints.length === 0
        ) {
            this.undoButton.disabled = true;
            this.finishButton.disabled = true;
            return;
        }

        this.undoButton.disabled = false;
        this.finishButton.disabled =
            this.currentPoints.length < 3;

        if (
            this.currentPoints.length >= 2
        ) {
            const polyline =
                this.createSvgElement(
                    'polyline',
                    {
                        points:
                            this.pointsToString(
                                this.currentPoints
                            ),
                        fill: 'none',
                        stroke: 'currentColor',
                        'stroke-width': 4,
                        'vector-effect':
                            'non-scaling-stroke',
                        'pointer-events': 'none'
                    }
                );

            polyline.classList.add(
                'image-zone-current-line'
            );

            this.drawingLayer.appendChild(
                polyline
            );
        }

        this.currentPoints.forEach(
            point => {
                const circle =
                    this.createSvgElement(
                        'circle',
                        {
                            cx: point.x,
                            cy: point.y,
                            r: 7,
                            fill: 'currentColor',
                            stroke: 'white',
                            'stroke-width': 3,
                            'vector-effect':
                                'non-scaling-stroke',
                            'pointer-events':
                                'none'
                        }
                    );

                circle.classList.add(
                    'image-zone-current-point'
                );

                this.drawingLayer.appendChild(
                    circle
                );
            }
        );
    }

    renderCompletedZones() {
        this.polygonLayer.replaceChildren();

        this.zones.forEach(
            (zone, index) => {
                const polygon =
                    this.createSvgElement(
                        'polygon',
                        {
                            points:
                                this.pointsToString(
                                    zone.points
                                ),
                            role: 'button',
                            tabindex: 0,
                            'aria-label':
                                `Image zone ${index + 1}`
                        }
                    );

                polygon.classList.add(
                    'image-zone-polygon'
                );

                polygon.dataset.zoneUuid =
                    zone.uuid;

                this.polygonLayer.appendChild(
                    polygon
                );
            }
        );
    }

    renderZoneList() {
        this.zoneList.replaceChildren();

        if (this.zones.length === 0) {
            const message =
                document.createElement('p');

            message.className =
                'text-body-secondary mb-0';

            message.textContent =
                'No completed zones yet.';

            this.zoneList.appendChild(
                message
            );

            return;
        }

        this.zones.forEach(
            (zone, index) => {
                const row =
                    document.createElement('div');

                row.className =
                    'list-group-item d-flex ' +
                    'justify-content-between ' +
                    'align-items-center';

                const label =
                    document.createElement('span');

                label.textContent =
                    `Zone ${index + 1} ` +
                    `(${zone.points.length} points)`;

                const button =
                    document.createElement('button');

                button.type = 'button';
                button.className =
                    'btn btn-sm btn-outline-danger';

                button.textContent = 'Delete';

                button.dataset.deleteZoneUuid =
                    zone.uuid;

                row.append(label, button);
                this.zoneList.appendChild(row);
            }
        );
    }

    createSvgElement(
        tagName,
        attributes = {}
    ) {
        const element =
            document.createElementNS(
                this.svgNamespace,
                tagName
            );

        Object.entries(attributes).forEach(
            ([name, value]) => {
                element.setAttribute(
                    name,
                    String(value)
                );
            }
        );

        return element;
    }

    pointsToString(points) {
        return points
            .map(
                point =>
                    `${point.x},${point.y}`
            )
            .join(' ');
    }
}