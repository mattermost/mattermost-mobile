// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EphemeralStore {
    constructor() {
        this.appStarted = false;
        this.appStartedFromPushNotification = false;
        this.deviceToken = null;
        this.navigationComponentIdStack = [];
    }

    getNavigationTopComponentId = () => this.navigationComponentIdStack[0];
    getNavigationComponentIds = () => this.navigationComponentIdStack;

    addNavigationComponentId = (componentId) => {
        const index = this.navigationComponentIdStack.indexOf(componentId);
        if (index > 0) {
            this.navigationComponentIdStack.slice(index, 1);
        }

        this.navigationComponentIdStack.unshift(componentId);
    }
}

export default new EphemeralStore();
