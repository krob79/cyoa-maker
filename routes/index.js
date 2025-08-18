import express from 'express';

// import speakersRoute from './speakers.js';
// import feedbackRoute from './feedback.js';
import storyRoute from './storyRoute.js';
import inventoryRoute from './inventoryRoute.js';

const router = express.Router();

export default (params) => {

    // router.use((request, response, next) => {
    //     console.log("---middleware?");
    //     return next();
    // });

    router.get('/', async (request, response, next) => {
        try {

            // //response.sendFile(path.join(__dirname, './static/index.html'));
            // return response.render('layout', { pageTitle: 'Peace, y\'all!', template: 'index', topSpeakers, artwork });
            return response.send("MAIN PAGE");
        } catch (err) {
            return next(err);
        }
    });

    router.get('/image', async (request, response, next) => {
        try {
            //response.sendFile(path.join(__dirname, './static/index.html'));
            return response.render('layout', { pageTitle: 'Image Upload', template: 'imgUploadTest' });
        } catch (err) {
            return next(err);
        }
    });

    // router.use('/speakers', speakersRoute(params));
    // router.use('/feedback', feedbackRoute(params));
    router.use('/page', storyRoute(params));
    router.use('/inventory', inventoryRoute(params));

    return router;
}