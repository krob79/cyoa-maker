import express from 'express';
import { check, validationResult } from 'express-validator';

const router = express.Router();

import inventory from '../services/inventory.js';

const validations = [
    check('value')
        .trim()
        .isLength({ min: 3 })
        .escape()
        .withMessage('This field cannot be blank.'),
];

const updateValidations = [
    check('uuid')
        .isString()
        .trim()
        .isLength({ min: 36, max: 36 })
        .escape()
        .withMessage('UUID must be a string of exactly 36 characters'),
    check('newDataObj')
        .isObject()
        .withMessage('A data object containing properties to update was expected.'),
];

const idValidation = [
    check('uuid')
        .isLength({ min: 36 })
        .withMessage('UUID not found.'),
];

export default (params) => {
    const { storyService } = params;

    router.get('/', async (request, response, next) => {
        return response.redirect('/page/b69d00be-744f-465c-bb90-c2a3a938ce20/edit');

    });

    router.get('/:uuid/graph', (req, res) => {
        res.render('graph', { title: 'Story Graph' });
    })

    router.get('/api/story', async (req, res) => {
        const story = await storyService.getList();
        res.json(story);
    });

    router.get('/:uuid/edit', async (request, response, next) => {
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');

        const query = request.query.q;

        if (query) {
            console.log("---query: ", query);
        } else {
            console.log("---no query found");
        }

        try {
            //get the entire list of data
            const allData = await storyService.getList();
            //the first "child" should be the story object
            const story = allData[0];
            //all elements of the story object should be page objects
            let pages = story.elements;
            //if no elements array is found, create an empty one
            if (!pages) {
                allData[0].elements = [];
            }

            //if there's anything that gets put in this events array, it came from the session, and is therefore from a choice link
            const events = Array.isArray(request.session?.events) ? request.session.events : [];
            console.log("---EVENT QUEUE: ", events);
            //these should be user initiated events that are tied to a Choice, so they won't fire automatically
            //therefore, we are replacing the "user" portion of the event string with "auto", then parsing so it fires
            events.forEach((evt) => {
                let newEvent = evt.value.replace(/user/, "auto");
                inventory.parseEventCommand(newEvent);
                console.log("--session evt found: ", evt);
            });
            //clear the session after we've found all the events and processed them, because the session should only store the events until the next page
            delete request.session.events;


            //need to collect all available UUIDs to check for broken links 
            const allPageUUIDs = pages.map(p => p.uuid);

            //Get list items for this specific UUID
            const pageData = await storyService.getDataByUUID({ uuid: request.params.uuid });


            const errors = request.session.pageData ? request.session.pageData.errors : false;
            const successMessage = request.session.pageData ? request.session.pageData.message : false;
            request.session.pageData = {};

            let pageListItems = pageData.elements.map(el => {
                //default true value, because there may be no conditions applied
                el.highlighted = false;
                el.isVisible = true;
                el.opacity = "1";
                // console.log(`---compare ${typeof el.uuid} with ${typeof query}`);
                if (el.uuid === query) {
                    // console.log("---found query!");
                    el.highlighted = true;
                }
                //checking if these elements are the type which would have conditions
                if (el.type == "text" || el.type == "image" || el.type == "choice" || el.type == "event") {
                    for (let i = 0; i < el.elements.length; i++) {
                        if (el.elements[i].type == "condition") {
                            // console.log(`---Checking condition ${el.elements[i].value}...${inventory.check(el.elements[i].value)}`);
                            if (!inventory.check(el.elements[i].value)) {
                                el.isVisible = false;
                            }
                        }
                    }
                }
                //if type is event, parse the string value and dispatch any auto events
                if (el.type == "event") {
                    let evtType = el.value.split("_")[0];
                    if (evtType == "auto") {
                        inventory.parseEventCommand(el.value);
                    }
                }
                return el;
            });

            let listPartialToUse;
            //TO DO: Find a more elegant way of doing this - do a better job of linking the type of the element to the partial
            //Based on what type of object we are looking at, we will need the right partial to display the data
            switch (pageData.type) {
                case "story":
                    listPartialToUse = "pagePartial"; //used for displaying pages as list items
                    break;
                case "page":
                    listPartialToUse = "elementPartial"; //used for displaying page elements as list items
                    break;
                default:
                    listPartialToUse = "conditionPartial"; //used for displaying conditions of an element as list items
                    break;
            }

            return response.render('layout', { pageTitle: "Editor Mode", template: 'listDisplay', story, pages, events, allPageUUIDs, pageData, pageListItems, listPartialToUse, errors, successMessage, query });
        } catch (err) {
            return next(err);
        }
    });

    router.get('/:uuid/view', async (request, response, next) => {
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');

        try {
            //get the entire list of data
            const allData = await storyService.getList();
            //the first "child" should be the story object
            const story = allData[0];
            //all elements of the story object should be page objects
            let pages = story.elements;
            //if no elements array is found, create an empty one
            if (!pages) {
                allData[0].elements = [];
            }

            const events = Array.isArray(request.session?.events) ? request.session.events : [];
            console.log("---EVENT QUEUE: ", events);
            //these should be user initiated events that are tied to a Choice, so they won't fire automatically
            //therefore, we are replacing the "user" portion of the event string with "auto", then parsing so it fires
            events.forEach((evt) => {
                let newEvent = evt.value.replace(/user/, "auto");
                inventory.parseEventCommand(newEvent);
                console.log("--session evt found: ", evt);
            });
            delete request.session.events;


            //need to collect all available UUIDs to check for broken links 
            const allPageUUIDs = pages.map(p => p.uuid);

            //Get list items for this specific UUID
            const pageData = await storyService.getDataByUUID({ uuid: request.params.uuid });


            const errors = request.session.pageData ? request.session.pageData.errors : false;
            const successMessage = request.session.pageData ? request.session.pageData.message : false;
            request.session.pageData = {};

            let pageListItems = pageData.elements.map(el => {
                // console.log(`---what type is this element? ${el.type}`);
                //default true value, because there may be no conditions applied
                el.isVisible = true;
                el.opacity = "1";
                //checking if these elements are the type which would have conditions
                if (el.type == "text" || el.type == "image" || el.type == "choice" || el.type == "event") {
                    for (let i = 0; i < el.elements.length; i++) {
                        if (el.elements[i].type == "condition") {
                            // console.log(`---Checking condition ${el.elements[i].value}...${inventory.check(el.elements[i].value)}`);
                            if (!inventory.check(el.elements[i].value)) {
                                el.isVisible = false;
                                // el.opacity = "0.4";
                            }
                        }
                    }
                }
                //if type is event, parse the string value and dispatch any auto events
                if (el.type == "event") {
                    console.log("---event detected on view: ", el.value);
                    let evtType = el.value.split("_")[0];
                    if (evtType == "auto") {
                        inventory.parseEventCommand(el.value);
                    }
                }
                return el;
            });



            //{evtname:'modalevent', detail: {title:`New Item Added: ${item.title}`,desc:`${item.desc}`,image:`item-${item.id}.png`}}
            // content.dispatchEvent(new CustomEvent({ evtname: 'modalevent', detail: { title: `New Item Added: ${'Some Stick'}`, desc: `${'It\'s just a crazy stick...'}`, image: `item-stick.png` } }));


            let listPartialToUse;
            //TO DO: Find a more elegant way of doing this - do a better job of linking the type of the element to the partial
            //Based on what type of object we are looking at, we will need the right partial to display the data
            switch (pageData.type) {
                case "story":
                    listPartialToUse = "pagePartial"; //used for displaying pages as list items
                    break;
                case "page":
                    listPartialToUse = "elementPartial"; //used for displaying page elements as list items
                    break;
                default:
                    listPartialToUse = "conditionPartial"; //used for displaying conditions of an element as list items
                    break;
            }

            return response.render('final', { pageTitle: "View Mode", template: 'storyPage', story, pages, allPageUUIDs, pageData, pageListItems, listPartialToUse, errors, successMessage });
        } catch (err) {
            return next(err);
        }
    });

    //used to pull data about an element, not to view as a page
    router.get('/:uuid', async (request, response, next) => {
        const pageData = await storyService.getDataByUUID({ uuid: request.params.uuid });
        return response.json(pageData);

    });

    router.get('/:uuid/allevents', async (request, response, next) => {
        console.log("---checking all events");
        const pageData = await storyService.getConditionsEventsList();
        const listPartialToUse = "elementPartial";

        sortArray(pageData.conditions);
        sortArray(pageData.events);


        let eventObj = separateArray([...pageData.events]);
        let conditionObj = separateArray([...pageData.conditions]);

        let filteredEventObj = Object.fromEntries(
            Object.entries(eventObj).filter(([key]) => !conditionObj.hasOwnProperty(key))
        );
        // console.log(eventObj);
        // console.log(conditionObj);

        function sortArray(arr) {
            arr.sort((a, b) => {
                const categoryA = a.name.toUpperCase();
                const categoryB = b.name.toUpperCase();

                if (categoryA < categoryB) {
                    return -1;
                }
                if (categoryA > categoryB) {
                    return 1;
                }
                return 0; // Categories are equal
            })
        }

        function separateArray(arr) {
            // console.log(arr);
            const seperatedArr = arr.reduce((acc, currentItem) => {
                const name = currentItem.name;
                if (!acc[name]) {
                    acc[name] = []; //initialize empty array if acc[name] doesn't exist
                }
                acc[name].push(currentItem);
                return acc;
            }, {});

            return seperatedArr;
        }




        return response.render('layout', { pageTitle: "Conditions and Events", template: 'eventList', pageData, eventObj, conditionObj, filteredEventObj, listPartialToUse });
    });

    router.post('/:uuid/event', async (request, response, next) => {
        const { events } = request.body;
        console.log("----at /event route: ", events);
        request.session = request.session || {};
        request.session.events = events;
        return res.json({ ok: true });
    });

    router.post('/api', validations, async (request, response, next) => {
        console.log("--- post /api");

        console.log("--- request body:");
        console.log(request.body);

        try {
            if (!request.body) {
                return response.status(400).json({ error: 'Missing JSON body' });
            }
            const errors = validationResult(request);
            //console.log(request.session);
            if (!errors.isEmpty()) {
                request.session.feedback = {
                    errors: errors.array(),
                }
                return response.redirect('/page'); //Shouldn't this redirect to the page where you currently are?
            }

            const { uuid, section, type, value, newline } = request.body;

            if (!uuid || !section || !type || typeof value !== 'string') {
                return response.status(400).json({ error: 'Missing required fields', got: request.body });
            }

            /*
            TO DO: Figure out if there is a simpler way and perhaps just give all of the FormData to this service and have 
            the whole thing written to the datafile? That way, we can structure our FormData how we like and not worry about
            shoehorning data into certain slots? We were trying to make all data objects structured the same for ease of use,
            but it might have made things more complicated instead? Ex: Choices and their values and having to split text
            */
            //await storyService.addDataByUUID({ uuid, title, section, type, value, newline });
            await storyService.addDataByUUID(request.body);

            const pageData = await storyService.getList();
            return response.json({ pageData, successMessage: 'Entry Successfully Added!' });

        } catch (err) {
            console.error('POST /page/api failed:', err);
            next(err);
        }

    });

    //get one entry using the UUID
    router.get('/api', idValidation, async (request, response, next) => {
        try {
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                return response.json({ errors: errors.array() });
            }
            const { uuid } = request.body;
            const feedback = await storyService.getEntry(uuid);

            if (!feedback) {
                console.log("---nothing was found");
                return response.json({ errors: ["UUID was not recognized."] });
            }
            return response.json(feedback);

        } catch (err) {
            next(err);
        }

    });

    //update text, image, or condition from JSON file
    router.put('/api', updateValidations, async (request, response, next) => {
        try {
            if (!request.body) {
                return response.status(400).json({ error: 'Missing JSON body' });
            }
            const errors = validationResult(request);
            console.log('VALIDATION ERRORS:', validationResult(request));
            console.log('BODY RECEIVED:', request.body);
            if (!errors.isEmpty()) {
                return response.status(400).json({ errors: errors.array() });
            }
            console.log("----page/api - PUT request - request body:");
            console.log(request.body);


            const { uuid, newDataObj } = request.body;
            if (!uuid || !newDataObj) {
                return response.status(400).json({ error: 'Missing uuid or newDataObj', got: request.body });
            }

            await storyService.updateDataByUUID(uuid, newDataObj);
            const pageData = await storyService.getList();
            return response.json({ pageData, successMessage: 'Entry has been updated!' });

        } catch (err) {
            console.error('PUT /page/api failed:', err);
            next(err);
        }

    });

    //delete text, image, or condition from JSON file
    router.delete('/api', async (request, response, next) => {
        console.log('---request body:', request.body);
        try {

            const { uuid } = request.body;

            await storyService.removeDataByUUID(uuid);
            const pageData = await storyService.getList();
            return response.json({ pageData, successMessage: 'Entry has been deleted!' });

        } catch (err) {
            next(err);
        }

    });

    //this deletes any entry with the uuid - is this better than the one above?
    router.delete('/:uuid', async (request, response, next) => {
        console.log('---attempting to delete:', request.params.uuid);
        try {
            const uuid = request.params.uuid;

            await storyService.removeDataByUUID(uuid);
            const pageData = await storyService.getList();
            return response.json({ pageData, successMessage: 'Entry has been deleted!' });

        } catch (err) {
            next(err);
        }

    });

    //
    router.post('/newpage/:uuid', validations, async (request, response, next) => {

        try {
            const uuid = request.params.uuid;
            console.log(`--- CALLING FOR NEW PAGE with story id: ${uuid}`);

            const { value } = request.body;
            console.log(`---request body text: ${value}`);
            console.log(`-----calling addNewPage: uuid: ${uuid}`);
            const newPageUUID = await storyService.addNewPage({ uuid, value });
            console.log(`-----page has been created, calling getDataByUUID - uuid: ${uuid}`);
            const thisData = await storyService.getDataByUUID({ uuid });
            console.log("---after calling getDataByUUID....");
            console.log(thisData.elements[thisData.elements.length - 1]);
            const newUUID = thisData.elements[thisData.elements.length - 1].uuid;

            // return response.json({ "response": "we made it" });
            return response.json({ newUUID });

        } catch (err) {
            next(err);
        }

    });

    return router;
}