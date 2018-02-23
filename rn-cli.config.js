// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
