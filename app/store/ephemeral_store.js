// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EphemeralStore {
    constructor() {
        this.appStarted = false;
        this.appStartedFromPushNotification = false;
        this.deviceToken = null;
        this.navigationComponentIdStack = [];
        this.allNavigationComponentIds = [];
        this.currentServerUrl = null;
    }

    getNavigationTopComponentId = () => this.navigationComponentIdStack[0];

    addNavigationComponentId = (componentId) => {
        this.addToNavigationComponentIdStack(componentId);
        this.addToAllNavigationComponentIds(componentId);
    };

    addToNavigationComponentIdStack = (componentId) => {
        const index = this.navigationComponentIdStack.indexOf(componentId);
        if (index > 0) {
            this.navigationComponentIdStack.slice(index, 1);
        }

        this.navigationComponentIdStack.unshift(componentId);
    }

    addToAllNavigationComponentIds = (componentId) => {
        if (!this.allNavigationComponentIds.includes(componentId)) {
            this.allNavigationComponentIds.unshift(componentId);
        }
    }

    removeNavigationComponentId = (componentId) => {
        const index = this.navigationComponentIdStack.indexOf(componentId);
        if (index >= 0) {
            this.navigationComponentIdStack.splice(index, 1);
        }
    }
}

export default new EphemeralStore();
