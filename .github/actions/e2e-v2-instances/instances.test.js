'use strict';

const {readyInstances, extract, bindWorker, envLines, passwords} = require('./instances');

function fakeInstance(id, state = 'ready') {
    return {
        state,
        site_url: `https://site-${id}.example`,
        admin: {username: 'sysadmin', email: 'sysadmin@example.com', password: `pw-${id}`},
    };
}

describe('e2e v2 instances', () => {
    const response = {
        batch: {
            instances: [
                fakeInstance(1),
                fakeInstance(2),
                {state: 'failed', site_url: 'https://dead.example'},
                fakeInstance(3),
            ],
        },
    };

    it('should keep ready instances in create order with site_url and admin', () => {
        expect(readyInstances(response)).toEqual([
            {site_url: 'https://site-1.example', admin: fakeInstance(1).admin},
            {site_url: 'https://site-2.example', admin: fakeInstance(2).admin},
            {site_url: 'https://site-3.example', admin: fakeInstance(3).admin},
        ]);
    });

    it('should extract when ready count matches workers plus extras', () => {
        expect(extract(response, {workerCount: 1, extraCount: 2})).toHaveLength(3);
    });

    it('should reject a ready-count mismatch', () => {
        expect(() => extract(response, {workerCount: 20, extraCount: 2})).toThrow(/expected 22 ready instances, got 3/);
    });

    it('should bind shard 1 to the first SITE_1 and the last two extras', () => {
        const instances = extract(response, {workerCount: 1, extraCount: 2});
        const bound = bindWorker(instances, 1);
        expect(bound.server_1.site_url).toBe('https://site-1.example');
        expect(bound.server_2.site_url).toBe('https://site-2.example');
        expect(bound.server_3.site_url).toBe('https://site-3.example');
    });

    it('should reject a shard outside the SITE_1 range', () => {
        const instances = extract(response, {workerCount: 1, extraCount: 2});
        expect(() => bindWorker(instances, 2)).toThrow(/outside SITE_1 range 0\.\.0/);
    });

    it('should reject an empty instances list', () => {
        expect(() => bindWorker([], 1)).toThrow(/got 0/);
    });

    it('should write SITE_* and admin env lines from the bound SITE_1', () => {
        const bound = bindWorker(extract(response, {workerCount: 1, extraCount: 2}), 1);
        expect(envLines(bound)).toContain('SITE_1_URL=https://site-1.example');
        expect(envLines(bound)).toContain('ADMIN_PASSWORD=pw-1');
    });

    it('should list admin passwords for masking', () => {
        expect(passwords(extract(response, {workerCount: 1, extraCount: 2}))).toEqual(['pw-1', 'pw-2', 'pw-3']);
    });

    it('should extract SITE_1 only when extra_count is 0', () => {
        const one = {
            batch: {instances: [fakeInstance(1)]},
        };
        expect(extract(one, {workerCount: 1, extraCount: 0})).toHaveLength(1);
    });

    it('should bind SITE_1 only and omit SITE_2 / SITE_3 when extra_count is 0', () => {
        const one = {
            batch: {instances: [fakeInstance(1)]},
        };
        const bound = bindWorker(extract(one, {workerCount: 1, extraCount: 0}), 1, 0);
        expect(bound.server_1.site_url).toBe('https://site-1.example');
        expect(bound.server_2).toBeUndefined();
        expect(bound.server_3).toBeUndefined();
        expect(envLines(bound)).toBe([
            'SITE_1_URL=https://site-1.example',
            'ADMIN_USERNAME=sysadmin',
            'ADMIN_EMAIL=sysadmin@example.com',
            'ADMIN_PASSWORD=pw-1',
        ].join('\n'));
        expect(envLines(bound)).not.toContain('SITE_2_URL=');
        expect(envLines(bound)).not.toContain('SITE_3_URL=');
    });
});
