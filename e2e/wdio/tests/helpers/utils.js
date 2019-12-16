// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('fs');

// Fixtures
export const users = JSON.parse(fs.readFileSync('wdio/fixtures/users.json'));
