#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('node:fs');
const path = require('node:path');

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CREDENTIAL = /\b(?:token|password|auth)\s*[:=]\s*["']?[^\s"']+["']?|\bbearer\s+["']?[^\s"']+["']?/gi;
const SENSITIVE_FIELD = /"(?:username|user_id|user|actor)"\s*:\s*"[^"]*"/gi;
const LONG_ID = /"id"\s*:\s*"[a-z0-9]{25,}"/gi;

function sanitizeMessage(message) {
    return message.
        replace(EMAIL, '[redacted-email]').
        replace(CREDENTIAL, '[redacted-credential]').
        replace(SENSITIVE_FIELD, '"[redacted-field]": "[redacted-value]"').
        replace(LONG_ID, '"id": "[redacted-id]"');
}

function sanitizeLogs(logs) {
    if (!Array.isArray(logs)) {
        return [];
    }

    return logs.map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.message !== 'string') {
            return entry;
        }
        return {...entry, message: sanitizeMessage(entry.message)};
    });
}

function writeJson(outputFile, value) {
    fs.mkdirSync(path.dirname(outputFile), {recursive: true});
    fs.writeFileSync(outputFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sanitizeFile(inputFile, outputFile) {
    try {
        const logs = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        writeJson(outputFile, sanitizeLogs(logs));
    } catch {
        // Diagnostics are best-effort. Invalid or unreadable input must never
        // upload raw logs or fail the E2E job.
        writeJson(outputFile, []);
    }
}

function main(argv = process.argv.slice(2)) {
    if (argv.length !== 2) {
        console.error('usage: sanitize-logs.js <input-file> <output-file>');
        return 1;
    }
    sanitizeFile(argv[0], argv[1]);
    return 0;
}

module.exports = {main, sanitizeFile, sanitizeLogs, sanitizeMessage};

if (require.main === module) {
    process.exitCode = main();
}
