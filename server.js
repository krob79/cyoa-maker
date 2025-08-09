require('dotenv').config();
const express = require('express');
const cors = require('cors');

//uploading files
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const cookieSession = require('cookie-session');
const createError = require('http-errors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});



app.set('trust proxy', 1); //makes express trust cookies if passed through reverse proxy
app.set('view engine', 'ejs'); //allows for parsing of EJS templating engine 
app.set('views', path.join(__dirname, './views')); //sets directory for the view templates

const FeedbackService = require('./services/FeedbackService');
const SpeakerService = require('./services/SpeakerService');
const StoryService = require('./services/StoryService');

const feedbackService = new FeedbackService('./data/feedback.json');
const speakersService = new SpeakerService('./data/speakers.json');
const storyService = new StoryService('./data/story.json');

const routes = require('./routes');

app.locals.siteName = "Kyle's BYOA";

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '/static', '/uploads');
console.log("---uploadDir: ", uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

//example of using cookieSession
app.use(cookieSession({
    name: 'session',
    keys: ['kjwe87234', 'kjwnwj982u'],
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, './static')));

app.use(async (request, response, next) => {
    try {
        const names = await speakersService.getNames();
        response.locals.speakerNames = names;
        return next();
    } catch (err) {
        return next(err);
    }
});

app.use(cors());
// Enable file upload middleware
app.use(fileUpload());

app.use('/', routes({ feedbackService, speakersService, storyService }));



//image upload
app.post('/upload', function (req, res) {

    console.log("----from app.post /upload: ");
    let sampleFile;
    let uploadPath;
    // console.log(req.files.file);

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
    try {
        const response = await openai.images.generate({
            model: "dall-e-3", // or "dall-e-2"
            prompt: "Generate an image of a happy baby duck surfing on a big wave",
            n: 1, // Number of images to generate (DALL-E 3 supports only 1)
            size: "1024x1024", // Image size
            quality: "standard", // or "hd" for DALL-E 3
        });

        const imageUrl = response.data[0].url;
        console.log("Generated Image URL:", imageUrl);
        return res.json(imageUrl);

    } catch (error) {
        console.error("Error generating image:", error);
        if (error.response) {
            console.error(error.response.status, error.response.data);
        }
        return res.json(error);
    }
}

);

app.use((response, request, next) => {
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