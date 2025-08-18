import express from 'express';
import { check, validationResult } from 'express-validator';

const router = express.Router();

import inventory from './inventory.js';

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

    router.get('/:uuid/edit', async (request, response, next) => {
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');

        // inventory.setAmount('items', 'apple', 0);
        // inventory.dispatchEvent({ evt: 'itemevent', name: 'apple', amount: 5 });

        // console.log("----get apple: ", inventory.get('items', 'apple'));
        // console.log("----APPLES > 100? " + inventory.check('apple>100'));

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
            const allPageUUIDs = pages.map(p => p.uuid);

            const allConditions = pages.map(p => {
                for (let i = 0; i < p.elements.length; i++) {
                    if (p.elements[i].type == "choice") {
                        return (p.elements[i].value.split("||")[1]);
                    }
                }

            });


            //Get list items for this specific UUID
            const pageData = await storyService.getDataByUUID({ uuid: request.params.uuid });
            let pageListItems = pageData.elements;

            const errors = request.session.pageData ? request.session.pageData.errors : false;
            const successMessage = request.session.pageData ? request.session.pageData.message : false;
            request.session.pageData = {};

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

            return response.render('layout', { pageTitle: "Editor Mode", template: 'newList', story, pages, allPageUUIDs, pageData, pageListItems, listPartialToUse, errors, successMessage });
        } catch (err) {
            return next(err);
        }
    });

    router.get('/:uuid', async (request, response, next) => {
        const pageData = await storyService.getDataByUUID({ uuid: request.params.uuid });
        return response.json(pageData);

    });

    router.post('/', validations, async (request, response, next) => {
        console.log("--- post /");
        try {
            const result = validationResult(request);
            if (!result.isEmpty()) {
                request.session.feedback = {
                    errors: errors.array(),
                }
                return response.redirect('/');
            }
            //if we get this far without errors, we assume the request body is valid, so grab those values
            const { name, email, title, message } = request.body;
            //
            await storyService.addEntry(uuid, name, email, title, message);
            request.session.feedback = { message: 'Thank you for your feedback!' };
            // return response.send(`Feedback posted`);
            return response.redirect('/');
        } catch (err) {
            return next(err);
        }
    });

    router.post('/api', validations, async (request, response, next) => {
        console.log("--- post /api");
        try {
            const errors = validationResult(request);


            //console.log(request.session);
            if (!errors.isEmpty()) {
                request.session.feedback = {
                    errors: errors.array(),
                }
                return response.redirect('/page'); //Shouldn't this redirect to the page where you currently are?
            }

            const { uuid, title, section, type, value, html } = request.body;

            const thisData = await storyService.getDataByUUID({ uuid });
            // console.log(`----reading in thisData...`);
            // console.log(thisData);
            const hasSection = Object.hasOwn(thisData, section);
            // console.log(`----Does this object have a property named '${section}'? ${hasSection}`);
            // if (!hasSection) {
            //     console.log("ERROR - No section exists to add this new content - possibly wrong UUID referenced as input");
            //     throw Error({ message: "No section exists to add this new content - possibly wrong UUID" })
            //     return response.redirect('/page');
            // }

            // console.log("---adding to section: ", section);

            await storyService.addDataByUUID({ uuid, title, section, type, value, html });

            const pageData = await storyService.getList();
            return response.json({ pageData, successMessage: 'Entry Successfully Added!' });

        } catch (err) {
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
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                request.session.feedback = {
                    errors: errors.array(),
                }
                return response.json({ errors: errors.array() });
            }
            console.log("----page/api - PUT request - request body:");
            console.log(request.body);


            const { uuid, newDataObj } = request.body;


            let xyz = await storyService.updateDataByUUID(uuid, newDataObj);
            const pageData = await storyService.getList();
            return response.json({ pageData, successMessage: 'Entry has been updated!' });

        } catch (err) {
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