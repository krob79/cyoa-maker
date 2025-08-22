// public/graph.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// -----------------------------
// 1) Fetch story JSON
// -----------------------------
fetch('/page/api/story')
    .then(r => r.json())
    .then(raw => {
        // 2) Adapt raw JSON into a node-link graph and then a D3 hierarchy
        const { rootId, nodes, edges } = normalizeStory(raw);

        // Determine start UUID from route pattern /page/:uuid/graph (preferred) or fallback to ?start=
        const pathMatch = window.location.pathname.match(/\/page\/([0-9a-fA-F-]{36})\/graph/);
        const startFromPath = pathMatch ? pathMatch[1] : null;

        // Legacy/fallback: also support ?start=<uuid>
        const params = new URLSearchParams(window.location.search);
        const startFromQuery = params.get('start');

        const chosenRoot = (startFromPath && nodes.has(startFromPath))
            ? startFromPath
            : (startFromQuery && nodes.has(startFromQuery))
                ? startFromQuery
                : rootId;

        if ((startFromPath && !nodes.has(startFromPath)) || (startFromQuery && !nodes.has(startFromQuery))) {
            const bad = startFromPath && !nodes.has(startFromPath) ? startFromPath : startFromQuery;
            console.warn(`Requested start UUID not found among page nodes: ${bad}. Falling back to ${rootId}.`);
        }

        const hierarchy = toHierarchy(chosenRoot, nodes, edges);
        // 3) Render tree
        renderTree(hierarchy);
        // 4) Basic integrity checks in console
        runDiagnostics(chosenRoot, nodes, edges);
    })
    .catch(err => console.error('Failed to load story JSON:', err));

// -----------------------------
// normalizeStory(raw)
//  - Accepts multiple input shapes and returns { rootId, nodes, edges }
// -----------------------------
function normalizeStory(raw) {
    // You can extend this to match your existing schema.
    // Supported shapes (examples):
    // A) { pages: [{id, title, isStart, choices:[{targetId}]}] }
    // B) { nodes: [{id, label, start}], links: [{source, target}] }
    // C) Flat object map { id: { title, choices:[id] } }
    // D) **Your shape**: an array with a {type:"story"} root whose `elements` contain nested {type:"page"} items.

    let nodes = new Map(); // id -> { id, label, ... }
    let edges = [];        // { source, target, text? }
    let rootId = null;


    function pageHasEvent(page) {
        let has = false;
        (function walk(els) {
            if (!els) return;
            for (const e of els) {
                if (e?.type === 'event') { has = true; return; }
                if (e?.elements?.length) walk(e.elements);
                if (has) return;
            }
        })(page.elements);
        return has;
    }

    function setBrokenFlags(nodes, edges) {
        const validIds = new Set(nodes.keys());
        const brokenSources = new Set();
        for (const e of edges) {
            if (!validIds.has(e.target)) brokenSources.add(e.source);
        }
        for (const id of brokenSources) {
            const n = nodes.get(id);
            if (n) n.hasBroken = true;   // <-- flag is set on the source page
        }
    }

    // ---------------------------
    // D) Array<[story]> with nested pages/choices (your format)
    // ---------------------------
    if (Array.isArray(raw) && raw.some(x => x && x.type === 'story')) {
        const storyNode = raw.find(x => x && x.type === 'story') || raw[0];

        // Gather all pages reachable under storyNode.elements
        const pages = [];
        (function walk(el) {
            if (!el) return;
            if (Array.isArray(el)) { el.forEach(walk); return; }
            if (el.type === 'page') pages.push(el);
            if (el.elements) walk(el.elements);
        })(storyNode.elements);

        // Index pages as graph nodes
        // When indexing pages (inside the branch that handles your JSON shape):
        for (const p of pages) {
            const id = p.uuid || p.id || p.value || p.title;
            nodes.set(id, {
                id,
                label: (p.value || p.title || id),
                raw: p,
                hasEvent: pageHasEvent(p)    // <-- new flag
            });
        }

        // For each page, find nested choices and add edges
        for (const p of pages) {
            const sourceId = p.uuid || p.id || p.value || p.title;
            const choices = [];
            (function collectChoices(els) {
                if (!els) return;
                for (const e of els) {
                    if (e && e.type === 'choice') choices.push(e);
                    if (e && Array.isArray(e.elements) && e.elements.length) collectChoices(e.elements);
                }
            })(p.elements);

            for (const ch of choices) {
                const { targetId, label } = parseChoice(ch);
                if (targetId) edges.push({ source: sourceId, target: targetId, text: label });
            }
        }

        // Root heuristic: prefer the first page found directly under the story's elements
        const firstPage = (storyNode.elements || []).find(e => e && e.type === 'page');
        if (firstPage) rootId = firstPage.uuid || firstPage.id || firstPage.value || firstPage.title;

        // If still no root, fall through to generic root selection below
    }
    // ---------------------------
    // A) pages[] shape
    // ---------------------------
    else if (Array.isArray(raw?.pages)) {
        for (const p of raw.pages) {
            nodes.set(p.id, { id: p.id, label: p.title ?? p.id, raw: p });
            if (p.choices) {
                for (const c of p.choices) {
                    if (c?.targetId) edges.push({ source: p.id, target: c.targetId, text: c.text });
                }
            }
            if (p.isStart) rootId = p.id;
        }
    }
    // ---------------------------
    // B) nodes/links shape
    // ---------------------------
    else if (Array.isArray(raw?.nodes) && Array.isArray(raw?.links)) {
        for (const n of raw.nodes) {
            nodes.set(n.id, { id: n.id, label: n.label ?? n.id, raw: n });
            if (n.start) rootId = n.id;
        }
        for (const l of raw.links) edges.push({ source: l.source, target: l.target, text: l.text });
    }
    // ---------------------------
    // C) Object-map shape
    // ---------------------------
    else if (raw && typeof raw === 'object') {
        for (const [id, val] of Object.entries(raw)) {
            nodes.set(id, { id, label: val.title ?? id, raw: val });
            if (Array.isArray(val.choices)) {
                for (const t of val.choices) edges.push({ source: id, target: t });
            }
            if (val.isStart) rootId = id;
        }
    } else {
        throw new Error('Unsupported story JSON shape');
    }

    // If no root chosen yet, pick a reasonable default
    if (!rootId && nodes.size) {
        // Pick the first node that is never a target (heuristic)
        const targets = new Set(edges.map(e => e.target));
        for (const id of nodes.keys()) { if (!targets.has(id)) { rootId = id; break; } }
        // Fallback: first id
        if (!rootId) rootId = nodes.keys().next().value;
    }

    // After you finish building all `edges`, call:
    setBrokenFlags(nodes, edges);

    return { rootId, nodes, edges };

    // --- helpers ---
    function parseChoice(el) {
        const val = (el && (el.value || el.title)) || '';
        const parts = val.split('||');
        const label = (parts[0] || '').trim() || el.title || el.value || 'choice';
        let targetId = null;
        // Prefer explicit UUID after "||"
        const m = val.match(/\|\|([0-9a-fA-F-]{36})/);
        if (m) targetId = m[1];
        // Fallback: parse from anchor href in html
        if (!targetId && el && el.html) {
            const m2 = String(el.html).match(/\/page\/([0-9a-fA-F-]{36})/);
            if (m2) targetId = m2[1];
        }
        return { label, targetId };
    }
}

// -----------------------------
// toHierarchy(rootId, nodes, edges)
//  - Builds a DAG-ish hierarchy for D3, guarding against cycles
// -----------------------------
function toHierarchy(rootId, nodes, edges) {
    const childrenBySource = new Map();
    for (const e of edges) {
        if (!childrenBySource.has(e.source)) childrenBySource.set(e.source, []);
        childrenBySource.get(e.source).push(e);
    }

    const visited = new Set();

    function build(id) {
        const node = nodes.get(id) || { id, label: id };
        const childEdges = childrenBySource.get(id) || [];

        if (visited.has(id)) {
            return { id: id + ' (↻)', label: node.label + ' (cycle)', isCycle: true, children: [] };
        }

        visited.add(id);
        const children = childEdges.map(e => build(e.target));
        visited.delete(id);

        return {
            id: node.id,
            label: node.label,
            raw: node.raw,
            hasBroken: !!node.hasBroken,   // <-- keep flags
            hasEvent: !!node.hasEvent,
            children
        };
    }

    return build(rootId);
}

// -----------------------------
// renderTree(hierarchy)
// -----------------------------
function renderTree(hierarchyData) {
    const svg = d3.select('#tree');
    const width = +svg.attr('width');
    const height = +svg.attr('height');

    svg.selectAll('*').remove(); // reset

    const g = svg.append('g').attr('transform', 'translate(60,40)');

    const root = d3.hierarchy(hierarchyData);
    // Collapse all children initially (optional)
    root.descendants().forEach((d) => {
        if (d.depth && d.children && d.children.length > 0) {
            d._children = d.children;
            d.children = null;
        }
    });

    const tree = d3.tree().size([height - 80, width - 200]);

    function update(source) {
        tree(root);
        const duration = 250;
        const nodes = root.descendants();
        const links = root.links();

        // shared toggle handler
        function toggle(d) {
            if (d.children) { d._children = d.children; d.children = null; }
            else { d.children = d._children; d._children = null; }
            update(d);
            console.log('Node clicked:', { id: d.data.id, label: d.data.label, raw: d.data.raw });
        }


        // --- Links ---
        const link = g.selectAll('path.link')
            .data(links, d => d.target.data.id);

        link.enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d => diagonal(d))
            .merge(link)
            .transition().duration(duration)
            .attr('d', d => diagonal(d));

        link.exit().transition().duration(duration).remove();

        // --- Nodes ---
        const EVENT_PATH = "M480-280q17 0 28.5-11.5T520-320t-11.5-28.5T480-360t-28.5 11.5T440-320t11.5 28.5T480-280m-40-160h80v-240h-80zm40 412L346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140zm0-340";

        const node = g.selectAll('g.node').data(nodes, d => d.data.id);

        const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y},${d.x})`)
            // .on('click', (event, d) => {
            //     if (d.children) { d._children = d.children; d.children = null; }
            //     else { d.children = d._children; d._children = null; }
            //     update(d);
            //     console.log('Node clicked:', { id: d.data.id, label: d.data.label, raw: d.data.raw });
            // });
            .on('click', (event, d) => toggle(d));

        nodeEnter.append('circle')
            .attr('r', 6)
            .classed('cycle', d => d.data.isCycle)
            .classed('broken', d => d.data.hasBroken); // <-- red if broken

        // label link (recenter)
        // const labelLink = nodeEnter.append('a')
        //     .attr('href', d => `/page/${d.data.id}/graph`)
        //     .on('click', (event) => { event.stopPropagation(); });

        // labelLink.append('text')
        //     .attr('dy', '0.32em')
        //     .attr('x', 10)
        //     .attr('class', 'recenter')
        //     .classed('broken', d => d.data.hasBroken)  // <-- red title if broken
        //     .text(d => d.data.label);

        // label (clicking behaves like clicking the node group)
        nodeEnter.append('text')
            .attr('dy', '0.32em')
            .attr('x', 10)
            .attr('class', 'label')  // (rename from 'recenter' for clarity)
            .classed('broken', d => d.data.hasBroken)
            .text(d => d.data.label);

        // event icon (overlay above circle) — only for nodes with events
        nodeEnter
            .filter(d => d.data.hasEvent)
            .append('g')
            .attr('class', 'event-icon')
            .attr('transform', 'translate(0,-12)')
            .append('path')
            // The path uses a ~960 unit box; scale it down and center over the circle
            .attr('d', EVENT_PATH)
            .attr('transform', 'translate(-7,-7) scale(0.015)');

        const nodeUpdate = nodeEnter.merge(node);

        // move nodes to new positions on update
        nodeUpdate.transition().duration(duration)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        // keep classes in sync on every update
        nodeUpdate.select('circle')
            .classed('broken', d => d.data.hasBroken);

        // nodeUpdate.select('a > text').classed('broken', d => d.data.hasBroken);
        nodeUpdate.select('text').classed('broken', d => d.data.hasBroken);

        // if you want to ensure icons exist after toggles, you can (optionally) refresh them:
        nodeUpdate.select('g.event-icon').remove();
        nodeUpdate.filter(d => d.data.hasEvent)
            .append('g')
            .attr('class', 'event-icon')
            .attr('transform', 'translate(0,-12)')
            .append('path')
            .attr('d', EVENT_PATH)
            .attr('transform', 'translate(-7,-7) scale(0.015)');

        node.exit().transition().duration(duration).remove();
    }

    function diagonal(link) {
        return `M${link.source.y},${link.source.x}C${(link.source.y + link.target.y) / 2},${link.source.x} ${(link.source.y + link.target.y) / 2},${link.target.x} ${link.target.y},${link.target.x}`;
    }

    update(root);
}

// -----------------------------
// runDiagnostics
//  - Console warnings for orphans, cycles, unreachable nodes
// -----------------------------
function runDiagnostics(rootId, nodes, edges) {
    const ids = new Set(nodes.keys());
    const sources = new Set(edges.map(e => e.source));
    const targets = new Set(edges.map(e => e.target));

    // Orphans: nodes that are neither a source nor a target (and not root)
    const orphans = [...ids].filter(id => !sources.has(id) && !targets.has(id) && id !== rootId);
    if (orphans.length) console.warn('Orphan pages (unlinked):', orphans);

    // Unresolved targets
    const missingTargets = [...targets].filter(t => !ids.has(t));
    if (missingTargets.length) console.warn('Edges that point to missing page IDs:', missingTargets);

    // Reachability check from root
    const adj = new Map();
    for (const id of ids) adj.set(id, []);
    for (const e of edges) if (adj.has(e.source)) adj.get(e.source).push(e.target);

    const seen = new Set();
    (function dfs(u) { if (seen.has(u)) return; seen.add(u); (adj.get(u) || []).forEach(dfs); })(rootId);
    const unreachable = [...ids].filter(id => !seen.has(id));
    if (unreachable.length) console.warn('Unreachable pages from root:', unreachable);
}