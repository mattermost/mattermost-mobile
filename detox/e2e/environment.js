// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {DetoxCircusEnvironment} = require('detox/runners/jest');

const TimeoutEvidenceListener = require('./timeout_evidence');

class Environment extends DetoxCircusEnvironment {
    constructor(config, context) {
        super(config, context);
        this.registerListeners({TimeoutEvidenceListener});
    }
}

module.exports = Environment;
