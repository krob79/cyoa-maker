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
        try {
            const story = await storyService.getList();
            console.log(story[0]);
            const uuid = story[0].uuid;
            const pages = story[0].pages;
            request.session.story = {};
            // return response.send("all good!");
            return response.render('layout', { pageTitle: 'PAGE LIST', template: 'pageList', story, uuid, pages });
        } catch (err) {
            return next(err);
        }

    });

    router.get('/:uuid/edit', async (request, response, next) => {
        try {
            const allData = await storyService.getList();
            const pages = allData[0].pages;
            const pageData = await storyService.getDataUUID({ uuid: request.params.uuid });

            const errors = request.session.pageData ? request.session.pageData.errors : false;
            const successMessage = request.session.pageData ? request.session.pageData.message : false;
            request.session.pageData = {};

            return response.render('layout', { pageTitle: pageData.title, template: 'storyPage', pages, pageData, errors, successMessage });
        } catch (err) {
            return next(err);
        }
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

    return router;
}