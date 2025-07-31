const express = require('express');

const router = express.Router();

module.exports = (params) => {

    const { speakersService } = params;

    router.get('/', async (request, response, next) => {
        try {
            const speakers = await speakersService.getList();
            const artwork = await speakersService.getAllArtwork();
            return response.render('layout', { pageTitle: 'Speakers', template: 'speakers', speakers, artwork });
        } catch (err) {
            return next(err);
        }
        // return response.send('some speakers will be here.');
    });

    router.get('/:shortname', async (request, response) => {
        try {
            const speaker = await speakersService.getSpeaker(request.params.shortname);
            const artwork = await speakersService.getArtworkForSpeaker(request.params.shortname)
            return response.render('layout', { pageTitle: `${request.params.name}`, template: 'speakers-detail', speaker, artwork });
            // return response.send(`Detail page of ${request.params.shortname}`);
        } catch (err) {
            return next(err);
        }

    });

    // router.get('/images/artwork/', async (request, response) => {
    //     const speaker = await speakersService.getSpeaker(request.params.shortname);
    //     response.render('layout', { pageTitle: `${request.params.name}`, template: 'speakers-detail', speaker });
    //     // return response.send(`Detail page of ${request.params.shortname}`);
    // });

    return router;
}