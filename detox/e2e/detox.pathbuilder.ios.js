// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const CustomPathBuilder = require('./detox.pathbuilder');
module.exports = ({rootDir}) => {
    return new CustomPathBuilder({rootDir, platform: 'ios'});
};
