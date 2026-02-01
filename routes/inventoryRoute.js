// routes/inventory.mjs
import express from 'express';
import inventory from '../services/inventory.js';
const router = express.Router();

export default (params) => {

    router.post('/event', (req, res, next) => {
        console.log("----calling inventory /event ", req.body);
        try {
            const result = inventory.dispatchEvent(req.body);
            res.json({ ok: true, result, snapshot: inventory.all() });
        } catch (e) {
            next(e);
        }
    });

    router.post('/parse', (req, res, next) => {
        console.log("----calling inventory /parse ", req.body.str);
        try {
            const result = inventory.parseEventCommand(req.body.str);
            res.json({ ok: true, result, snapshot: inventory.all() });
        } catch (e) {
            next(e);
        }
    });

    router.get('/export', (req, res) => {
        const b64 = inventory.exportBase64();
        res.json({ ok: true, base64: b64 });
    });

    router.get('/', (req, res) => {
        //console.log(req.query.property);
        let query = req.query.property;
        const result = inventory.grabValue(query);
        console.log(`------ATTEMPTING INVENTORY CHECK THROUGH FETCH -'${query}':${result}`);
        res.json({ ok: true, result });
    });

    //haven't really tested this too much - not sure how big the base64 data string would be
    router.post('/import', (req, res, next) => {
        try {
            const { base64, mode } = req.body; // mode: 'merge' | 'replace'
            inventory.importBase64(base64, { mode: mode === 'replace' ? 'replace' : 'merge' });
            res.json({ ok: true, snapshot: inventory.all() });
        } catch (e) {
            next(e);
        }
    });

    return router;

}


