// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

class Telemetry {
    constructor() {
        /**
         * metric: {
         *   name:
         *   startTime:
         *   endTime:
         *   elapsedTime:
         * }
         */
        this.appStartTime = 0;
        this.reactInitializedStartTime = 0;
        this.reactInitializedEndTime = 0;
        this.metrics = [];
        this.currentMetrics = {};
        this.pendingSinceLaunchMetrics = [];

        this.initializeNativeMetrics();
    }

    initializeNativeMetrics = async () => true;

    captureStart = () => true;

    captureEnd = () => true;

    capture = () => true;

    captureSinceLaunch = () => true;

    sendMetrics = () => true;
}

const telemetry = new Telemetry();
export default telemetry;
