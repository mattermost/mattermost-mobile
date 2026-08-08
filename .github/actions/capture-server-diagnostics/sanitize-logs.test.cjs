// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const {main, sanitizeFile, sanitizeLogs, sanitizeMessage} = require('./sanitize-logs');

test('sanitizeMessage redacts supported PII and credential forms', () => {
    const input = [
        'email=user.name+ci@example.com',
        'token="secret-token"',
        'Authorization: Bearer bearer-secret',
        '"username": "private-user"',
        '"actor":"private-actor"',
        '"id": "abcdefghijklmnopqrstuvwxyz123456"',
    ].join(' ');
    const output = sanitizeMessage(input);

    assert.equal(output.includes('user.name+ci@example.com'), false);
    assert.equal(output.includes('secret-token'), false);
    assert.equal(output.includes('bearer-secret'), false);
    assert.equal(output.includes('private-user'), false);
    assert.equal(output.includes('private-actor'), false);
    assert.equal(output.includes('abcdefghijklmnopqrstuvwxyz123456'), false);
    assert.match(output, /\[redacted-email\]/);
    assert.match(output, /\[redacted-credential\]/);
    assert.match(output, /"\[redacted-field\]": "\[redacted-value\]"/);
    assert.match(output, /"id": "\[redacted-id\]"/);
});

test('sanitizeLogs changes only string messages in object entries', () => {
    const input = [
        {message: 'password=secret', level: 'error'},
        {message: 42, level: 'info'},
        'raw-entry',
        null,
    ];

    assert.deepEqual(sanitizeLogs(input), [
        {message: '[redacted-credential]', level: 'error'},
        {message: 42, level: 'info'},
        'raw-entry',
        null,
    ]);
    assert.equal(input[0].message, 'password=secret', 'sanitization must not mutate parsed input');
});

test('sanitizeLogs rejects a non-array payload', () => {
    assert.deepEqual(sanitizeLogs({message: 'token=secret'}), []);
});

test('sanitizeFile writes an empty array for malformed or unreadable input', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanitize-logs-'));
    const malformed = path.join(dir, 'malformed.json');
    const missing = path.join(dir, 'missing.json');
    const malformedOutput = path.join(dir, 'nested', 'malformed-output.json');
    const missingOutput = path.join(dir, 'missing-output.json');
    fs.writeFileSync(malformed, '{not-json');

    sanitizeFile(malformed, malformedOutput);
    sanitizeFile(missing, missingOutput);

    assert.deepEqual(JSON.parse(fs.readFileSync(malformedOutput, 'utf8')), []);
    assert.deepEqual(JSON.parse(fs.readFileSync(missingOutput, 'utf8')), []);
    fs.rmSync(dir, {recursive: true, force: true});
});

test('main rejects an invalid argument count', () => {
    assert.equal(main([]), 1);
    assert.equal(main(['input-only']), 1);
});
