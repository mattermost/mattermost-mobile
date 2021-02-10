// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {
    DetoxCircusEnvironment,
    SpecReporter,
    WorkerAssignReporter,
} = require('detox/runners/jest-circus');

class CustomDetoxEnvironment extends DetoxCircusEnvironment {
    constructor(config, context) {
        super(config, context);

        this.initTimeout = 300000;

        // This takes care of generating status logs on a per-spec basis. By default, Jest only reports at file-level.
        // This is strictly optional.
        this.registerListeners({
            SpecReporter,
            WorkerAssignReporter,
        });
    }
}

module.exports = CustomDetoxEnvironment;
