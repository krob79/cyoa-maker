const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

const validations = [
    check('name')
        .trim()
        .isLength({ min: 3 })
        .isLength({ min: 3 })
        .escape()
        .withMessage('A name is required, dude!'),
    check('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Need a valid email, bro!'),
    check('title')
        .trim()
        .isLength({ min: 3 })
        .escape()
        .withMessage('Need a title, homey!'),
    check('message')
        .trim()
        .isLength({ min: 5 })
        .escape()
        .withMessage('You need a better message, champ!')
];

const idValidation = [
    check('uuid')
        .isLength({ min: 36 })
        .withMessage('UUID not found.'),
];

module.exports = (params) => {
    const { feedbackService } = params;

    router.get('/', async (request, response, next) => {
        try {
            const feedback = await feedbackService.getList();
            // console.log(feedback);
            const errors = request.session.feedback ? request.session.feedback.errors : false;
            const successMessage = request.session.feedback ? request.session.feedback.message : false;
            request.session.feedback = {};

            return response.render('layout', { pageTitle: 'Feedback', template: 'feedback', feedback, errors, successMessage });
        } catch (err) {
            return next(err);
        }

    });

    router.post('/', validations, async (request, response, next) => {
        try {
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                request.session.feedback = {
                    errors: errors.array(),
                }
                return response.redirect('/feedback');
            }
            //if we get this far without errors, we assume the request body is valid, so grab those values
            const { name, email, title, message } = request.body;
            //
            await feedbackService.addEntry(uuid, name, email, title, message);
            request.session.feedback = { message: 'Thank you for your feedback!' };
            // return response.send(`Feedback posted`);
            return response.redirect('/feedback');
        } catch (err) {
            return next(err);
        }
    });

    router.post('/api', validations, async (request, response, next) => {
        try {
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                return response.json({ errors: errors.array() });
            }

            const { name, email, title, message } = request.body;

            await feedbackService.addEntry(name, email, title, message);
            const feedback = await feedbackService.getList();
            return response.json({ feedback, successMessage: 'Thank you for your feedback!' });

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
            const feedback = await feedbackService.getEntry(uuid);

            if (!feedback) {
                console.log("---nothing was found");
                return response.json({ errors: ["UUID was not recognized."] });
            }
            return response.json(feedback);

        } catch (err) {
            next(err);
        }

    });

    router.put('/api', validations, async (request, response, next) => {
        try {
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                return response.json({ errors: errors.array() });
            }

            const { uuid, name, email, title, message } = request.body;
            const data = { name, email, title, message };

            const UUIDIsThere = await feedbackService.getEntry(uuid);

            if (!UUIDIsThere) {
                console.log("---nothing was found");
                return response.json({ errors: ["UUID was not recognized."] });
            }

            await feedbackService.updateEntry(uuid, data);
            const feedback = await feedbackService.getList();
            return response.json({ feedback, successMessage: 'Thank you for your feedback!' });

        } catch (err) {
            next(err);
        }

    });

    router.delete('/api', async (request, response, next) => {
        try {

            const { uuid } = request.body;

            const UUIDIsThere = await feedbackService.getEntry(uuid);

            if (!UUIDIsThere) {
                console.log("---nothing was found");
                return response.json({ errors: ["UUID was not recognized."] });
            }

            await feedbackService.removeEntry(uuid);
            const feedback = await feedbackService.getList();
            return response.json({ feedback, successMessage: 'Entry has been deleted!' });

        } catch (err) {
            next(err);
        }

    });

    return router;
}