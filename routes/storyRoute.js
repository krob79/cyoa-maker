const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

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

module.exports = (params) => {
    const { storyService } = params;

    router.get('/', async (request, response, next) => {
        return response.redirect('/page/b69d00be-744f-465c-bb90-c2a3a938ce20/edit');

    });

    router.get('/:uuid/edit', async (request, response, next) => {
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
        try {
            const allData = await storyService.getList();
            const story = allData[0];
            const pages = allData[0].elements;
            const pageData = await storyService.getDataByUUID({ uuid: request.params.uuid });

            const errors = request.session.pageData ? request.session.pageData.errors : false;
            const successMessage = request.session.pageData ? request.session.pageData.message : false;
            request.session.pageData = {};
            let pageListItems = pageData.elements;
            console.log("----what are the pageListItems?");
            console.log(pageData);
            let listPartialToUse;
            //TO DO: Find a more elegant way of doing this - do a better job of linking the type of the element to the partial
            switch (pageData.type) {
                case "story":
                    listPartialToUse = "pagePartial";
                    break;
                case "page":
                    listPartialToUse = "elementPartial";
                    break;
                case "text":
                    listPartialToUse = "conditionPartial";
                    break;
                case "image":
                    listPartialToUse = "conditionPartial";
                    break;
                case "choice":
                    listPartialToUse = "conditionPartial";
                    break;
                default:
                    listPartialToUse = "conditionPartial";
                    break;
            }

            return response.render('layout', { pageTitle: "WHATEVER", template: 'newList', story, pages, pageData, pageListItems, listPartialToUse, errors, successMessage });
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
            console.log(`----reading in thisData...`);
            console.log(thisData);
            const hasSection = Object.hasOwn(thisData, section);
            console.log(`----Does this object have a property named '${section}'? ${hasSection}`);
            if (!hasSection) {
                console.log("ERROR - No section exists to add this new content - possibly wrong UUID referenced as input");
                throw Error({ message: "No section exists to add this new content - possibly wrong UUID" })
                return response.redirect('/page');
            }

            console.log("---adding to section: ", section);

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

    router.put('/api', updateValidations, async (request, response, next) => {
        try {
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                request.session.feedback = {
                    errors: errors.array(),
                }
                return response.json({ errors: errors.array() });
            }
            console.log("----request body:");
            console.log(request.body);


            const { uuid, newDataObj } = request.body;


            await storyService.updateDataByUUID(uuid, newDataObj);
            const pageData = await storyService.getList();
            return response.json({ pageData, successMessage: 'Entry has been updated!' });

        } catch (err) {
            next(err);
        }

    });

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

    return router;
}