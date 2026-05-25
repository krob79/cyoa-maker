import express from 'express';
import { check, validationResult } from 'express-validator';

const router = express.Router();

import inventory from '../services/inventory.js';

const validations = [
    check('value')
        .trim()
        .isLength({ min: 1 })
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

    const resolveGroups = (conditionsArray) => {
        console.log("---resolve groups");
        //establish condition groups
        let allGroups = [];
        let group = [];
        let allGroupsPass = false;
        let groupPass = true;

        for (let x = 0; x < conditionsArray.length; x++) {
            // if the booloperator says "and" or nothing, add it to the same array or "group" of conditions
            //edge case here - if the very first condition in the whole list happens to be "or", add it to the current group like it was "and"
            //because it's still the beginning of a new group
            if (conditionsArray[x].booloperator == "and" || conditionsArray[x].booloperator == "" || x < 1) {
                group.push(conditionsArray[x]);
            } else {
                allGroups.push(group);
                group = [];
                group.push(conditionsArray[x]);
            }
        }
        if (group.length > 0) {
            allGroups.push(group);
        }

        for (let i = 0; i < allGroups.length; i++) {
            groupPass = true;
            for (let j = 0; j < allGroups[i].length; j++) {
                if (!inventory.check(allGroups[i][j].value)) {
                    groupPass = false;
                }
                console.log(`----checking ${allGroups[i][j].value}: ${inventory.check(allGroups[i][j].value)}`);
            }
            console.log(`--------GROUP ${i} PASS: ${groupPass}`);
            if (groupPass == true) {
                allGroupsPass = true;
                break;
            }
        }
        console.log("------FINAL CONDITION OUTCOME: " + allGroupsPass);
        return allGroupsPass;

    }

    const processPageElement = (storyuuid, query, elements) => {
        console.log(`---running processPageElement()`);
        //console.log(pageData);
        let currGroupIndex = 0;
        let pageListItems = elements.map(el => {
            //default true value, because there may be no conditions applied
            el.storyUuid = storyuuid;
            el.highlighted = false;
            el.isVisible = true;
            el.opacity = "1";

            // console.log(`---processed element: ${el.storyUuid}`);

            // console.log(`---compare ${typeof el.uuid} with ${typeof query}`);
            if (el.uuid === query) {
                // console.log("---found query!");
                el.highlighted = true;
            }
            //checking if these elements are the type which would have conditions

            //checking if these elements are the type which would have conditions
            if (el.type == "text" || el.type == "image" || el.type == "choice" || el.type == "event" || el.type == "dynamic") {

                //filter all conditions
                let conditions = el.elements.filter((e) => {
                    return e.type == "condition";
                })
                if (conditions.length > 0) {
                    // console.log(`---CONDITIONS FOUND ON ${el.type}`);
                    //console.log(conditions);
                    el.isVisible = resolveGroups(conditions);
                }

                if (el.type == "dynamic") {
                    // console.log("----dynamic element found!");
                    el.dynamic = inventory.grabValue(el.value);
                }
            }

            if (el.type == "condition") {
                if (el.booloperator == "or") {
                    currGroupIndex++;
                    // console.log("adding to group index");
                }
                el["groupName"] = `g${currGroupIndex}`;

                // console.log(`----CONDITION: ${el.title} BOOL:${el.booloperator} GROUP: ${el.groupName}`);

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
        //console.log(pageListItems);
        return pageListItems;
    }

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
            //sessions are the key to carrying an event from a choice over to the next page
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

            let pageListItems = processPageElement(story.uuid, query, pageData.elements);

            return response.render('layout', { pageTitle: "Editor Mode", template: 'listDisplay', story, pages, events, allPageUUIDs, pageData, pageListItems, errors, successMessage, query });
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
            const query = request.query.q;

            const errors = request.session.pageData ? request.session.pageData.errors : false;
            const successMessage = request.session.pageData ? request.session.pageData.message : false;
            request.session.pageData = {};

            let pageListItems = processPageElement(story.uuid, query, pageData.elements);

            //{evtname:'modalevent', detail: {title:`New Item Added: ${item.title}`,desc:`${item.desc}`,image:`item-${item.id}.png`}}
            // content.dispatchEvent(new CustomEvent({ evtname: 'modalevent', detail: { title: `New Item Added: ${'Some Stick'}`, desc: `${'It\'s just a crazy stick...'}`, image: `item-stick.png` } }));

            return response.render('final', { pageTitle: "View Mode", template: 'storyPage', story, pages, allPageUUIDs, pageData, pageListItems, errors, successMessage });
        } catch (err) {
            return next(err);
        }
    });

    router.post('/render-entries', async (req, res, next) => {
        console.log("-----HITTING RENDER ENTRY ROUTE");
        //console.log(req.body.items);

        const query = req.query.q;

        if (query) {
            console.log("---query: ", query);
        }

        try {
            const { items, storyuuid, allPageUUIDs } = req.body;

            if (!Array.isArray(items)) {
                return res.status(400).json({ error: 'items must be an array' });
            }
            //(story, query, elements)
            let processedItems = processPageElement(storyuuid, query, items);

            //console.log("---PROCESSED ITEMS:");
            //console.log(processedItems);

            res.render('pages/partials/entryList', { items: processedItems, storyuuid, allPageUUIDs }, (err, html) => {
                if (err) {
                    console.error(err);
                    return next(err);
                }

                res.json({ html });
            });

        } catch (err) {
            next(err);
        }
    });

    //used to pull data about an element, not to view as a page
    router.get('/:uuid', async (request, response, next) => {
        const pageData = await storyService.getDataByUUID({ uuid: request.params.uuid });
        return response.json(pageData);

    });

    router.get('/:uuid/allevents', async (request, response, next) => {
        /*
        This route will display all conditions and events created by the user property name, sorting by name.
        For each property created by the user, a list of conditions that use that property will display in one column, 
        followed by a list events that also use the same property in a second column.
        The list prioritizes conditions at the top of the list, even if there are no corresponding events.
        After all conditions have been displayed, any remaining events that have no conditions paired with them will display.
        */
        console.log("---checking all events");
        let testProp = "woodencane";
        let removeProp = "banana";
        console.log(`-------checking for the existence of ${testProp} - ${inventory.hasAny(testProp)}`);
        inventory.removeAny(removeProp);
        const pageData = await storyService.getConditionsEventsList();
        const listPartialToUse = "elementPartial";


        //sort both arrays by property names
        sortArray(pageData.conditions);
        sortArray(pageData.events);

        //sort each property into its own nested array, returning an array of arrays
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

    //this is called by choice links that contain events, because the session has to store the event data during the page transition
    router.post('/:uuid/event', async (request, response, next) => {
        const { events } = request.body;
        console.log("----at /event route: ", events);
        request.session = request.session || {};
        request.session.events = events;
        return res.json({ ok: true });
    });

    router.post('/api', validations, async (request, response, next) => {
        console.log("--- post /api");

        console.log("--- request body yay:");
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
            console.log('VALIDATION ERRORS ON UPDATE:', validationResult(request));
            // console.log('BODY RECEIVED:', request.body);
            if (!errors.isEmpty()) {
                return response.status(400).json({ errors: errors.array() });
            }
            //console.log("----page/api - PUT request - request body:");
            // console.log(request.body);


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

    router.post('/newpage/', validations, async (request, response, next) => {

        try {
            const { uuid, value } = request.body;
            console.log(`-----calling addNewPage from /newpage/ route - uuid: ${uuid}`);
            const newPageUUID = await storyService.addNewPage({ uuid, value });
            const thisData = await storyService.getDataByUUID({ uuid: newPageUUID });
            return response.json(thisData);

        } catch (err) {
            next(err);
        }

    });

    return router;
}