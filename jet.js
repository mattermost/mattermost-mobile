#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-process-env */
if (process.argv.includes('--coverage') && !process.env.NYC_CONFIG) {
    process.argv.unshift(require.resolve('./node_modules/.bin/nyc'));
    require('./node_modules/.bin/nyc');
} else {
    require('./lib/commonjs/cli.js');
}
