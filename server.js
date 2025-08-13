// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');

// //uploading files
// const fileUpload = require('express-fileupload');
// const fs = require('fs');
// const https = require('https');
// const path = require('path');
// const cookieSession = require('cookie-session');
// const createError = require('http-errors');
// const bodyParser = require('body-parser');
// const OpenAI = require('openai');

import 'dotenv/config';

import express from 'express';
import cors from 'cors';

//uploading files
import fileUpload from 'express-fileupload';
import fs from 'fs';
import https from 'https';
import path from 'path';
import cookieSession from 'cookie-session';
import createError from 'http-errors';
import bodyParser from 'body-parser';
import OpenAI from 'openai';
import Sortable from 'sortablejs';

const app = express();
const port = 3000;



const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});



app.set('trust proxy', 1); //makes express trust cookies if passed through reverse proxy
app.set('view engine', 'ejs'); //allows for parsing of EJS templating engine 
app.set('views', path.join(process.cwd(), './views')); //sets directory for the view templates

// import FeedbackService from './services/FeedbackService.js';
// import SpeakerService from './services/SpeakerService.js';
import StoryService from './services/StoryService.js';

// const feedbackService = new FeedbackService('./data/feedback.json');
// const speakersService = new SpeakerService('./data/speakers.json');
const storyService = new StoryService('./data/story.json');

import routes from './routes/index.js';

app.locals.siteName = "Kyle's BYOA";

// Ensure uploads folder exists
const uploadDir = path.join(process.cwd(), 'static', 'uploads');
console.log("---uploadDir: ", uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

//example of using cookieSession
app.use(cookieSession({
    name: 'session',
    keys: ['kjwe87234', 'kjwnwj982u'],
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(process.cwd(), './static')));

app.use(async (request, response, next) => {
    try {
        // const names = await speakersService.getNames();
        // response.locals.speakerNames = names;
        return next();
    } catch (err) {
        return next(err);
    }
});

app.use(cors());
// Enable file upload middleware
app.use(fileUpload());

app.use('/', routes({ storyService }));


//this is not really being used at the moment, but created it to try and store a file reference in a file input field...?
async function createImageFileFromUrl(imageUrl, fileName = 'image.png', fileType = 'image/png') {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`HTTP ERROR! Status: ${response.status}`)
        }
        const blob = await response.blob();
        const imageFile = new File([blob], fileName, { type: fileType });
        return imageFile;
    } catch (e) {
        console.error(`ERROR creating file from URL: ${error}`);
        return null;
    }

}


//downloading an image from a URL
async function saveImage(url, filepath) {

    try {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log("Image downloaded and saved successfully!");
            });
        });
        return file;
    } catch (error) {
        console.error("Error saving image:", error);
    }
}


//making a copy of an image from a local directory and placing it in the '/uploads' directory
app.post('/upload', function (req, res) {
    console.log("----from app.post /upload: ");
    let sampleFile;
    let uploadPath;
    // console.log(req.files.file);

    //this is looking for specific file objects
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ msg: 'No files were uploaded.' });
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    sampleFile = req.files.file;
    uploadPath = uploadDir + '/' + sampleFile.name;

    console.log("---uploadPath: ", uploadPath);

    // Use the mv() method to place the file somewhere on your server
    sampleFile.mv(uploadPath, function (err) {
        if (err)
            return res.status(500).send(err);

        res.json(sampleFile.name);
    });
});

app.post('/generate-text', async (req, res) => {
    try {
        const response = await openai.responses.create({
            model: "gpt-5",
            input: req.body.prompt
        });

        console.log(response.output_text);
        return res.json(response.output_text);
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        res.status(500).json({ error: 'Failed to generate text.' });
    }
});

app.post('/generate-img', async (req, res) => {
    console.log("----using /generate-img  route...");
    console.log(req.body.prompt)
    let promptPortion = req.body.prompt.split(" ", 4);
    let newFilename = promptPortion.join("_");
    newFilename += Math.floor(Math.random() * ((Math.floor(1000)) - (Math.ceil(1)) + 1) + (Math.ceil(1)));
    console.log("----NEW AI FILE NAME!!!! ", newFilename);
    try {
        const response = await openai.images.generate({
            model: "dall-e-3", // or "dall-e-2"
            prompt: req.body.prompt,
            n: 1, // Number of images to generate (DALL-E 3 supports only 1)
            size: "1024x1024", // Image size
            quality: "standard", // or "hd" for DALL-E 3
        });

        //this should be the returned URL from OpenAI's API
        const imageUrl = response.data[0].url;
        console.log("Generated Image URL:", imageUrl);

        //download and create local version of generated image
        let uploadPath = uploadDir + '/' + `${newFilename}.jpg`;
        const dlImage = await saveImage(imageUrl, uploadPath);

        let splitPath = uploadPath.split('/');
        let shortenedPath = splitPath[splitPath.length - 1];
        console.log(uploadPath);

        return res.json(shortenedPath);

    } catch (error) {
        console.error("Error generating image:", error);
        if (error.response) {
            console.error(error.response.status, error.response.data);
        }
        return res.json(error);
    }
}

);

app.use((request, response, next) => {
    return next(createError(404, 'File not found! DAAAAMN'));
})
app.use((err, request, response, next) => {
    response.locals.message = err.message;
    const status = err.status || 500;
    response.locals.status = status;
    response.status(status);
    response.render('error');
});


app.listen(port, () => {
    console.log(`-----------------------------------------`);
    console.log(`Express server listening on port ${port}!`);
    console.log(`-----------------------------------------`);
});