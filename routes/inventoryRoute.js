// routes/inventory.mjs
import express from 'express';
import inventory from './inventory.js';
const router = express.Router();

export default (params) => {

    router.post('/event', (req, res, next) => {
        try {
            const result = inventory.dispatchEvent(req.body);
            res.json({ ok: true, result, snapshot: inventory.all() });
        } catch (e) {
            next(e);
        }
    });

    router.get('/export', (req, res) => {
        const b64 = inventory.exportBase64();
        res.json({ ok: true, base64: b64 });
    });

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


