'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('e2e-v2 server-env', () => {
    it('should be a JSON object of MM_* string settings', () => {
        const raw = fs.readFileSync(path.join(__dirname, 'server-env.json'), 'utf8');
        const env = JSON.parse(raw);
        assert.equal(typeof env, 'object');
        assert.notEqual(env, null);
        const keys = Object.keys(env);
        assert.ok(keys.length > 0);
        for (const key of keys) {
            assert.match(key, /^MM_[A-Z0-9_]+$/);
            assert.equal(typeof env[key], 'string');
            assert.ok(env[key].length > 0);
        }
        assert.equal(env.MM_SERVICEENVIRONMENT, 'test');
        assert.equal(env.MM_SERVICESETTINGS_ENABLETUTORIAL, 'false');
    });
});
