// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

// Restore VisibleMatcher default from 75% back to 50%.
// Detox 20.48.0 changed this default (PR #4915), causing elements that are
// 50-74% visible to no longer be matched. Our tests rely on the 50% threshold.
const nativePath = path.join(__dirname, '..', 'node_modules', 'detox', 'src', 'android', 'matchers', 'native.js');

if (!fs.existsSync(nativePath)) {
    console.log('postinstall: detox native.js not found, skipping VisibleMatcher patch');
    process.exit(0);
}

const original = fs.readFileSync(nativePath, 'utf8');
const patched = original.replace(
    'constructor(pct = 75)',
    'constructor(pct = 50)',
);

if (original === patched) {
    console.log('postinstall: VisibleMatcher already at 50% or pattern not found, no change needed');
} else {
    fs.writeFileSync(nativePath, patched, 'utf8');
    console.log('postinstall: VisibleMatcher default restored to 50%');
}
