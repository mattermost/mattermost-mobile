// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {checkManifest} = require('./check-server-mutation-manifest');

const MUTATOR = 'beforeAll(() => requireMutationServer("x"));';
const A = 'detox/e2e/test/a.e2e.ts';
const B = 'detox/e2e/test/b.e2e.ts';

describe('checkManifest', () => {
    it('should accept listed specs that require the mutation server', () => {
        assert.deepEqual(checkManifest({mutation: [{spec: A, target: 'B', iosTarget: 'site3'}]}, {[A]: MUTATOR, [B]: 'it()'}), []);
    });

    it('should reject a missing array, bad targets, duplicates and missing files', () => {
        assert.equal(checkManifest({}, {}).length, 1);
        const problems = checkManifest({mutation: [
            {spec: A, target: 'C'},
            {spec: A, target: 'B', iosTarget: 'A'},
            {spec: 'detox/e2e/test/gone.e2e.ts', target: 'B'},
        ]}, {[A]: MUTATOR});
        assert.equal(problems.length, 4);
        assert.match(problems.join('\n'), /target "C"/);
        assert.match(problems.join('\n'), /more than once/);
        assert.match(problems.join('\n'), /iosTarget "A"/);
        assert.match(problems.join('\n'), /gone\.e2e\.ts does not exist/);
    });

    it('should reject a listed spec without the marker and an unlisted spec with it', () => {
        const problems = checkManifest({mutation: [{spec: A, target: 'B'}]}, {[A]: 'it()', [B]: MUTATOR});
        assert.deepEqual(problems, [
            `${A} is listed but never calls requireMutationServer()`,
            `${B} calls requireMutationServer() but is not listed in detox/e2e/server_mutation_specs.json`,
        ]);
    });
});
