// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class Telemetry {
    constructor() {
        this.appStartTime = 0;
        this.reactInitializedStartTime = 0;
        this.reactInitializedEndTime = 0;
        this.metrics = [];
        this.currentMetrics = {};
        this.pendingSinceLaunchMetrics = [];
    }

    setAppStartTime = () => true;

    reset = () => true;

    canSendTelemetry = () => false;

    start = () => true;

    end = () => true;

    include = () => true;

    startSinceLaunch = () => true;

    remove = () => true;

    save = () => true;
}

const telemetry = new Telemetry();
export default telemetry;
