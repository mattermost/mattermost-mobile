// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable global-require, no-process-env */

if (process.env.NODE_ENV === 'production') {
    module.exports = require('./configureStore.prod.js');
} else {
    module.exports = require('./configureStore.dev.js');
}

/* eslint-enable global-require, no-process-env */