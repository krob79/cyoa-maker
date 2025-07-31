const express = require('express');

const speakersRoute = require('./speakers');
const feedbackRoute = require('./feedback');
const storyPageRoute = require('./storyPage');

const router = express.Router();

module.exports = (params) => {
    // console.log(`---params? `, params);

    const { speakersService } = params;

    // router.use((request, response, next) => {
    //     console.log("---middleware?");
    //     return next();
    // });

    router.get('/', async (request, response, next) => {
        try {
            const artwork = await speakersService.getAllArtwork();
            const topSpeakers = await speakersService.getList();

            if (!request.session.visitcount) {
                request.session.visitcount = 1;
            } else {
                request.session.visitcount += 1;
                console.log(`---NUM OF VISITS: ${request.session.visitcount}`);
            }
            //response.sendFile(path.join(__dirname, './static/index.html'));
            return response.render('layout', { pageTitle: 'Peace, y\'all!', template: 'index', topSpeakers, artwork });
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

    router.use('/speakers', speakersRoute(params));
    router.use('/feedback', feedbackRoute(params));
    router.use('/page', storyPageRoute(params));

    return router;
}