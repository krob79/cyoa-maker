// inventory.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), 'data', 'inventory.json');
const SAVE_DEBOUNCE_MS = 300; // batch writes

// Map evt -> domain bucket
const EVT_DOMAIN = {
    itemevent: 'items',
    characterevent: 'characters',
    locationevent: 'locations',
    storyevent: 'storyevents',
};

class Inventory extends EventEmitter {
    constructor(filePath) {
        super();
        this.filePath = filePath;
        // domain -> Map(name -> { name, amount, meta })
        this.data = new Map();
        this.version = 1;
        this._loaded = false;
        this._saveTimer = null;

        // Ensure default domains exist
        Object.values(EVT_DOMAIN).forEach((domain) => {
            if (!this.data.has(domain)) this.data.set(domain, new Map());
        });
    }

    async load() {
        if (this._loaded) return;
        try {
            const txt = await fs.readFile(this.filePath, 'utf8');
            const parsed = JSON.parse(txt);
            this.version = parsed.version ?? 1;
            this.data = new Map();
            Object.values(EVT_DOMAIN).forEach((d) => this.data.set(d, new Map()));

            if (parsed && parsed.data) {
                for (const [domain, payload] of Object.entries(parsed.data)) {
                    if (!this.data.has(domain)) this.data.set(domain, new Map());
                    const bucket = this.data.get(domain);

                    if (Array.isArray(payload)) {
                        payload.forEach(({ name, amount, meta }) => {
                            bucket.set(name, { name, amount: Number(amount) || 0, meta: meta ?? {} });
                        });
                    } else if (payload && typeof payload === 'object') {
                        for (const [name, amount] of Object.entries(payload)) {
                            bucket.set(name, { name, amount: Number(amount) || 0, meta: {} });
                        }
                    }
                }
            }
        } catch (err) {
            if (err.code !== 'ENOENT') throw err; // ignore first-run missing file
        }
        this._loaded = true;
    }

    _scheduleSave() {
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            this.save().catch(() => { });
        }, SAVE_DEBOUNCE_MS);
    }

    async save() {
        const obj = {
            version: this.version,
            data: {},
        };
        for (const [domain, bucket] of this.data.entries()) {
            obj.data[domain] = Array.from(bucket.values()).map(({ name, amount, meta }) => ({
                name,
                amount,
                meta: meta ?? {},
            }));
        }
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(obj, null, 2), 'utf8');
    }

    /** Ensure domain & entry exist. Never delete entries. */
    _getEntry(domain, name) {
        if (!this.data.has(domain)) this.data.set(domain, new Map());
        const bucket = this.data.get(domain);
        if (!bucket.has(name)) {
            bucket.set(name, {
                name,
                amount: 0,
                meta: { createdAt: new Date().toISOString() },
            });
        }
        return bucket.get(name);
    }

    /** Apply delta, clamp at 0 (never negative), never remove */
    apply(domain, name, delta) {
        const entry = this._getEntry(domain, name);
        const prev = entry.amount;
        const next = Math.max(0, prev + Number(delta || 0));
        entry.amount = next;
        this.emit('changed', { domain, name, delta, total: next });
        this._scheduleSave();
        return next;
    }

    /** Read helpers */
    get(domain, name) {
        const bucket = this.data.get(domain);
        return bucket?.get(name) ?? { name, amount: 0, meta: {} };
    }

    setAmount(domain, name, value) {
        const entry = this._getEntry(domain, name);
        const next = Math.max(0, Number(value || 0));
        entry.amount = next;
        this.emit('changed', { domain, name, delta: null, total: next, op: 'set' });
        this._scheduleSave();
        return next;
    }

    setAny(name, value, { defaultDomain = 'items' } = {}) {
        const found = this._findByName(name);
        if (found?.entry) return this.setAmount(found.domain, name, value);
        // not found anywhere -> create in default domain
        return this.setAmount(defaultDomain, name, value);
    }

    list(domain) {
        return Array.from(this.data.get(domain)?.values() ?? []);
    }
    all() {
        const out = {};
        for (const [domain, bucket] of this.data.entries()) {
            out[domain] = Array.from(bucket.values());
        }
        return out;
    }

    /** Merge meta into an entry (create entry if missing). */
    setMeta(name, meta = {}) {
        const { domain, entry } = this._findByName(name) ?? {};
        if (entry) {
            entry.meta = { ...(entry.meta ?? {}), ...meta };
        } else {
            // If not found anywhere, create in a default domain (items)
            const created = this._getEntry('items', name);
            created.meta = { ...(created.meta ?? {}), ...meta };
        }
        this._scheduleSave();
    }

    /** Find an entry by name across all domains (case-insensitive). */
    _findByName(name, { caseInsensitive = true } = {}) {
        if (!name) return null;
        const needle = caseInsensitive ? String(name).toLowerCase() : name;
        for (const [domain, bucket] of this.data.entries()) {
            if (!bucket) continue;
            if (!caseInsensitive && bucket.has(needle)) {
                return { domain, entry: bucket.get(needle) };
            }
            // case-insensitive scan
            for (const v of bucket.values()) {
                if ((v?.name ?? '').toLowerCase() === needle) {
                    return { domain, entry: v };
                }
            }
        }
        return null;
    }

    _decodeEntities(str) {
        return str
            .replace(/&gt;/gi, '>')
            .replace(/&lt;/gi, '<')
            .replace(/&amp;/gi, '&')
            .replace(/&equals;/gi, '=');
    }

    /** Parse "name op value" like 'apple>2' or 'persontomeet="Bob Smith"'. */
    _parseCondition(expr) {
        if (typeof expr !== 'string') throw new Error('Condition must be a string');
        const s = this._decodeEntities(expr.trim());

        // name (group1), operator (group2), value (group3)
        const m = s.match(/^(.+?)(<=|>=|==|=|!=|<|>)(.+)$/);
        if (!m) {
            throw Error(`Invalid condition: ${expr}`);
        }

        const rawName = m[1].trim();
        const op = m[2].trim();
        let rawValue = m[3].trim();

        // strip matching quotes for string values
        if (
            (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
            (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ) {
            rawValue = rawValue.slice(1, -1);
        }

        // decide if numeric
        const numeric = /^-?\d+(\.\d+)?$/.test(rawValue);
        const value = numeric ? Number(rawValue) : rawValue;

        return { name: rawName, op, value, numeric };
    }

    grabValue(name) {
        //console.log("---grabbing value from ", name);
        const found = this._findByName(name, { caseInsensitive: true });

        //console.log("---found: ", found);

        let result = found?.entry?.amount;
        if (!result) {
            console.log(`---no result found for '${name}' from inventory`);
            result = found?.entry?.meta?.value ?? ''
        }
        //console.log("---grabValue result: ", result, " ", typeof result);

        return found?.entry?.amount ?? 0;

        // if (returnValueOnly) {
        //     console.log("---NO COMPARISON NEEDED - RETURN VALUE ONLY!!!");
        //     if (numeric) {
        //         return found?.entry?.amount ?? 0;
        //     } else {
        //         return String(found?.entry?.meta?.value ?? '') === String(value);
        //     }
        // }
    }

    /**
     * Check a condition string against inventory.
     * - Numeric RHS: compare against amount (missing => amount=0).
     * - String RHS: compare against entry.meta.value (missing entry => false).
     */
    check(expr, { caseInsensitive = true } = {}) {

        const { name, op, value, numeric } = this._parseCondition(expr);

        // Find the entry by name across all domains
        const found = this._findByName(name, { caseInsensitive });

        if (numeric) {
            const amount = found?.entry?.amount ?? 0;
            switch (op) {
                case '>':
                    // console.log(`-----CHECKING ${expr} ${amount > value} - ${amount}`);
                    return amount > value;
                    break;
                case '>=':
                    // console.log(`-----CHECKING ${expr} ${amount >= value} - ${amount}`);
                    return amount >= value;
                    break;
                case '<':
                    // console.log(`-----CHECKING ${expr} ${amount < value} - ${amount}`);
                    return amount < value;
                    break;
                case '<=':
                    // console.log(`-----CHECKING ${expr} ${amount <= value} - ${amount}`);
                    return amount <= value;
                    break;
                case '=':
                case '==':
                    // console.log(`-----CHECKING ${expr} ${amount === value} - ${amount}`);
                    return amount === value;
                    break;
                case '!=':
                    // console.log(`-----CHECKING ${expr} ${amount !== value} - ${amount}`);
                    return amount !== value;
                    break;
                default: return false;
            }
        } else {
            // String comparisons only make sense with equality/inequality
            const target = found?.entry?.meta?.value;
            switch (op) {
                case '=':
                case '==': return String(target ?? '') === String(value);
                case '!=': return String(target ?? '') !== String(value);
                default: return false; // e.g., '>' on strings is not supported
            }
        }
    }

    /** Check if an entry exists anywhere in the inventory (case-insensitive by default). */
    hasAny(name, { caseInsensitive = true } = {}) {
        return Boolean(this._findByName(name, { caseInsensitive })?.entry);
    }

    parseEventCommand(str) {
        let split = str.split('_');
        let eType = split[0];
        let eProperty = split[1];
        let eOperator = split[2];
        let eAmount = split[3];
        // console.log(`----found event - ${eType} / ${eProperty} / ${eOperator} / ${eAmount}`);
        // if (eType == "auto") {
        switch (eOperator) {
            case "+":
                // console.log(`---increasing amount of ${eProperty} by ${eAmount}`);
                this.dispatchEvent({ evt: 'itemevent', name: eProperty, amount: eAmount });
                break;
            case "=":
                this.setAmount('items', eProperty, eAmount);
                break;
            case "-":
                this.dispatchEvent({ evt: 'itemevent', name: eProperty, amount: (eAmount * -1) });
                break;
        }

        // }

    }

    /** Single entry point for your event syntax */
    dispatchEvent(evt) {
        if (!evt || !evt.evt || !evt.name) return;
        const domain = EVT_DOMAIN[evt.evt];
        if (domain) {
            const n = Number(evt.amount || 0);
            const isSet = evt.op === 'set';
            const total = isSet
                ? this.setAmount(domain, evt.name, n)  // <-- hard set
                : this.apply(domain, evt.name, n);     // <-- delta (add/subtract)

            if (evt.meta && typeof evt.meta === 'object') {
                const entry = this.get(domain, evt.name);
                entry.meta = { ...(entry.meta ?? {}), ...evt.meta };
                this._scheduleSave();
            }
            return total;
        }

        // ✅ Option A: dedicated hard-delete event
        // Usage:
        //   { evt: 'remove', name: 'apple' }                 -> removeAny('apple')
        //   { evt: 'remove', name: 'apple', domain: 'items' } -> remove('items','apple')
        if (evt.evt === 'remove' && evt.name) {
            if (evt.domain) return this.remove(evt.domain, evt.name);
            return this.removeAny(evt.name);
        }

        // Optional: a dedicated meta-set event
        if (evt.evt === 'setmeta' && evt.meta) {
            this.setMeta(evt.name, evt.meta);
            return true;
        }

        // Unknown event => ignore
        return;
    }

    /** Export JSON -> Base64 */
    exportBase64() {
        const payload = {
            version: this.version,
            exportedAt: new Date().toISOString(),
            data: {}, // domain -> { name: amount }
        };
        for (const [domain, bucket] of this.data.entries()) {
            payload.data[domain] = {};
            for (const { name, amount } of bucket.values()) {
                payload.data[domain][name] = amount;
            }
        }
        const json = JSON.stringify(payload);
        return Buffer.from(json, 'utf8').toString('base64');
    }

    /**
     * Import Base64 -> JSON
     * options:
     *   - mode: 'merge' | 'replace' (default: 'merge')
     */
    importBase64(b64, { mode = 'merge' } = {}) {
        const json = Buffer.from(String(b64), 'base64').toString('utf8');
        const parsed = JSON.parse(json);

        if (!parsed || typeof parsed !== 'object' || !parsed.data) {
            throw new Error('Invalid import payload');
        }

        for (const [domain, mapObj] of Object.entries(parsed.data)) {
            if (!this.data.has(domain)) this.data.set(domain, new Map());
            const bucket = this.data.get(domain);

            for (const [name, amountRaw] of Object.entries(mapObj)) {
                const amount = Math.max(0, Number(amountRaw) || 0);
                const current = this._getEntry(domain, name);
                if (mode === 'replace') {
                    current.amount = amount;
                } else {
                    current.amount = Math.max(0, (current.amount || 0) + amount);
                }
            }
        }

        this.emit('imported', { mode });
        this._scheduleSave();
    }

    /** Hard-delete an entry from a specific domain bucket. Returns true if removed. */
    remove(domain, name, { emitEvent = true } = {}) {
        if (!domain || !name) return false;

        const bucket = this.data.get(domain);
        if (!bucket) return false;

        // Handle case-insensitive issues by deleting the *stored* key if needed
        let keyToDelete = name;
        if (!bucket.has(keyToDelete)) {
            const needle = String(name).toLowerCase();
            for (const [k, v] of bucket.entries()) {
                if (String(v?.name ?? k).toLowerCase() === needle) {
                    keyToDelete = k; // this is the actual Map key
                    break;
                }
            }
        }

        const existed = bucket.delete(keyToDelete);
        if (!existed) return false;

        if (emitEvent) {
            this.emit('removed', { domain, name: keyToDelete });
            // Optional: keep existing listeners happy if they only watch "changed"
            this.emit('changed', { domain, name: keyToDelete, delta: null, total: 0, op: 'remove' });
        }

        this._scheduleSave();
        return true;
    }

    /** Hard-delete by name across all domains (case-insensitive by default). */
    removeAny(name, { caseInsensitive = true, emitEvent = true } = {}) {
        const found = this._findByName(name, { caseInsensitive });
        if (!found?.domain || !found?.entry) return false;

        // Use the stored name so we delete the correct Map key/casing
        return this.remove(found.domain, found.entry.name, { emitEvent });
    }
}

// --- Singleton across imports and dev reloads
const singleton =
    globalThis.__inventorySingleton ?? new Inventory(DATA_FILE);
globalThis.__inventorySingleton = singleton;

void singleton.load(); // fire-and-forget

export default singleton;
export { EVT_DOMAIN }; // optional, if you want to extend elsewhere
