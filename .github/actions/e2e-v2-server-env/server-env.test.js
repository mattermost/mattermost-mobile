'use strict';

const fs = require('node:fs');
const path = require('node:path');

describe('e2e-v2 server-env', () => {
    it('should be a JSON object of MM_* string settings', () => {
        const raw = fs.readFileSync(path.join(__dirname, 'server-env.json'), 'utf8');
        const env = JSON.parse(raw);
        expect(env).toEqual(expect.any(Object));
        expect(env).not.toBeNull();
        const keys = Object.keys(env);
        expect(keys.length).toBeGreaterThan(0);
        for (const key of keys) {
            expect(key).toMatch(/^MM_[A-Z0-9_]+$/);
            expect(typeof env[key]).toBe('string');
            expect(env[key].length).toBeGreaterThan(0);
        }
        expect(env.MM_SERVICEENVIRONMENT).toBe('test');
        expect(env.MM_SERVICESETTINGS_ENABLETUTORIAL).toBe('false');
    });
});
