'use strict';

const fs = require('fs');

const EXTRA_COUNT = 2;

function readyInstances(response) {
    const list = response?.batch?.instances;
    if (!Array.isArray(list)) {
        return [];
    }
    return list.filter((instance) => instance != null && instance.state === 'ready').map((instance) => ({
        site_url: instance.site_url,
        admin: instance.admin,
    }));
}

function extract(response, {workerCount, extraCount = EXTRA_COUNT} = {}) {
    const workers = Number(workerCount);
    const extras = Number(extraCount);
    if (!Number.isInteger(workers) || workers < 1) {
        throw new Error(`worker_count must be a positive integer, got '${workerCount}'`);
    }
    if (!Number.isInteger(extras) || extras < 0) {
        throw new Error(`extra_count must be a non-negative integer, got '${extraCount}'`);
    }

    const instances = readyInstances(response);
    const expected = workers + extras;
    if (instances.length !== expected) {
        throw new Error(`expected ${expected} ready instances, got ${instances.length}`);
    }
    return instances;
}

function bindWorker(instances, shardId, extraCount = EXTRA_COUNT) {
    const extras = Number(extraCount);
    if (!Number.isInteger(extras) || extras < 0) {
        throw new Error(`extra_count must be a non-negative integer, got '${extraCount}'`);
    }

    const n = Array.isArray(instances) ? instances.length : 0;
    if (n < extras + 1) {
        throw new Error(extras === 0 ?
            `instances must include at least one SITE_1, got ${n}` :
            `instances must include SITE_1 plus ${extras} extras, got ${n}`);
    }

    const idx = Number(shardId) - 1;
    const site1Count = n - extras;
    if (!Number.isInteger(idx) || idx < 0 || idx >= site1Count) {
        throw new Error(`worker ${shardId} index ${idx} is outside SITE_1 range 0..${site1Count - 1}`);
    }

    if (extras === 0) {
        return {server_1: instances[idx]};
    }

    return {
        server_1: instances[idx],
        server_2: instances[n - 2],
        server_3: instances[n - 1],
    };
}

function envLines(bound) {
    if (!bound?.server_1?.site_url) {
        throw new Error('server_1 instance is missing site_url');
    }
    const lines = [
        `SITE_1_URL=${bound.server_1.site_url}`,
        `ADMIN_USERNAME=${bound.server_1.admin?.username ?? ''}`,
        `ADMIN_EMAIL=${bound.server_1.admin?.email ?? ''}`,
        `ADMIN_PASSWORD=${bound.server_1.admin?.password ?? ''}`,
    ];
    if (bound.server_2 || bound.server_3) {
        const missing = ['server_2', 'server_3'].filter((key) => !bound[key]?.site_url);
        if (missing.length) {
            throw new Error(`${missing.join('/')} instance is missing site_url`);
        }
        lines.splice(1, 0, `SITE_2_URL=${bound.server_2.site_url}`, `SITE_3_URL=${bound.server_3.site_url}`);
    }
    return lines.join('\n');
}

function passwords(instances) {
    return (instances ?? []).map((instance) => instance?.admin?.password).filter((password) => Boolean(password));
}

function parseArgs(argv) {
    const out = {_: []};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = argv[i + 1];
        if (a === '--response') {
            out.response = next;
            i += 1;
        } else if (a === '--workers') {
            out.workers = next;
            i += 1;
        } else if (a === '--extras') {
            out.extras = next;
            i += 1;
        } else if (a === '--shard') {
            out.shard = next;
            i += 1;
        } else if (!a.startsWith('-')) {
            out._.push(a);
        }
    }
    return out;
}

function loadResponse(path) {
    if (!path) {
        throw new Error('create response path is required');
    }
    if (!fs.existsSync(path)) {
        throw new Error('create response artifact is missing');
    }
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}

if (require.main === module) {
    const args = parseArgs(process.argv.slice(2));
    const command = args._[0];
    const response = loadResponse(args.response);
    if (command === 'extract') {
        process.stdout.write(`${JSON.stringify(extract(response, {workerCount: args.workers, extraCount: args.extras}))}\n`);
    } else if (command === 'bind') {
        const instances = readyInstances(response);
        process.stdout.write(`${envLines(bindWorker(instances, args.shard, args.extras))}\n`);
    } else if (command === 'passwords') {
        for (const password of passwords(readyInstances(response))) {
            process.stdout.write(`${password}\n`);
        }
    } else {
        throw new Error('usage: instances.js extract|bind|passwords --response <file> [--workers n] [--extras n] [--shard n]');
    }
}

module.exports = {
    EXTRA_COUNT,
    readyInstances,
    extract,
    bindWorker,
    envLines,
    passwords,
    parseArgs,
};
