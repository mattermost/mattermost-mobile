'use strict';

/**
 * Split a leased site URL list into per-worker SITE_1 URLs and shared extras.
 * sites[0..workerCount-1] = dedicated SITE_1
 * sites[workerCount] = SITE_2
 * sites[workerCount+1] = SITE_3
 */
function splitSites(sites, workerCount, extraCount = 2) {
    if (!Array.isArray(sites)) {
        throw new Error('sites must be an array');
    }
    if (!Number.isInteger(workerCount) || workerCount < 1) {
        throw new Error('workerCount must be a positive integer');
    }
    if (!Number.isInteger(extraCount) || extraCount < 2) {
        throw new Error('extraCount must be >= 2');
    }
    const total = workerCount + extraCount;
    if (sites.length < total) {
        throw new Error(`expected ${total} sites, got ${sites.length}`);
    }
    const empty = sites.findIndex((url) => !url);
    if (empty !== -1) {
        throw new Error(`site at index ${empty} is empty`);
    }
    return {
        workerSiteUrls: sites.slice(0, workerCount),
        extraSiteUrls: sites.slice(workerCount, total),
        site2Url: sites[workerCount],
        site3Url: sites[workerCount + 1],
    };
}

if (require.main === module) {
    const sites = JSON.parse(process.argv[2] || '[]');
    const workerCount = Number(process.argv[3]);
    const extraCount = Number(process.argv[4] || 2);
    const result = splitSites(sites, workerCount, extraCount);
    process.stdout.write(JSON.stringify(result));
}

module.exports = {splitSites};
