// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const path = require('path');
const blacklist = require('metro/src/blacklist');

const config = {
    getBlacklistRE() {
        return blacklist([/react-native\/local-cli\/core\/__fixtures__.*/]);
    },
    getProjectRoots() {
        return [
            path.resolve(__dirname, '.'),
        ];
    },
};

module.exports = config;
