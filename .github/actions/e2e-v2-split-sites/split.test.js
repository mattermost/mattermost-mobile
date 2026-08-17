'use strict';

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
        expect(result.workerSiteUrls).toEqual(['https://w1.example', 'https://w2.example']);
        expect(result.site2Url).toBe('https://extra2.example');
        expect(result.site3Url).toBe('https://extra3.example');
        expect(result.extraSiteUrls).toHaveLength(2);
    });

    it('should reject too few sites', () => {
        expect(() => splitSites(['https://a.example'], 8, 2)).toThrow(/expected 10 sites/);
    });

    it('should split 8 workers plus 2 extras', () => {
        const sites = Array.from({length: 10}, (_, i) => `https://s${i}.example`);
        const result = splitSites(sites, 8, 2);
        expect(result.workerSiteUrls).toHaveLength(8);
        expect(result.workerSiteUrls[0]).toBe('https://s0.example');
        expect(result.workerSiteUrls[7]).toBe('https://s7.example');
        expect(result.site2Url).toBe('https://s8.example');
        expect(result.site3Url).toBe('https://s9.example');
    });

    it('should reject an empty URL', () => {
        expect(() => splitSites(
            ['https://a.example', '', 'https://c.example', 'https://d.example'],
            2,
            2,
        )).toThrow(/index 1 is empty/);
    });
});
