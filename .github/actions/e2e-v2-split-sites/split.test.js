'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const {splitSites} = require('./split');

describe('splitSites', () => {
    it('should assign one SITE_1 per worker and two shared extras', () => {
        const sites = [
            'https://w1.example',
            'https://w2.example',
            'https://extra2.example',
            'https://extra3.example',
        ];
        const result = splitSites(sites, 2, 2);
        assert.deepEqual(result.workerSiteUrls, ['https://w1.example', 'https://w2.example']);
        assert.equal(result.site2Url, 'https://extra2.example');
        assert.equal(result.site3Url, 'https://extra3.example');
        assert.equal(result.extraSiteUrls.length, 2);
    });

    it('should reject too few sites', () => {
        assert.throws(() => splitSites(['https://a.example'], 8, 2), /expected 10 sites/);
    });

    it('should split 8 workers plus 2 extras', () => {
        const sites = Array.from({length: 10}, (_, i) => `https://s${i}.example`);
        const result = splitSites(sites, 8, 2);
        assert.equal(result.workerSiteUrls.length, 8);
        assert.equal(result.workerSiteUrls[0], 'https://s0.example');
        assert.equal(result.workerSiteUrls[7], 'https://s7.example');
        assert.equal(result.site2Url, 'https://s8.example');
        assert.equal(result.site3Url, 'https://s9.example');
    });

    it('should reject an empty URL', () => {
        assert.throws(
            () => splitSites(['https://a.example', '', 'https://c.example', 'https://d.example'], 2, 2),
            /index 1 is empty/,
        );
    });
});
