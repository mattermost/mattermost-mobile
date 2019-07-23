// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EphemeralStore {
    constructor() {
        this.appStarted = false;
        this.appStartedFromPushNotification = false;
        this.deviceToken = null;
        this.navigationComponentIdStack = [];
        this.currentServerUrl = null;
        this.realmStores = {};
        this.postsForChannelSince = {};
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

    getRealmStoreForCurrentServer = () => {
        return this.realmStores[this.currentServerUrl];
    };

    getRealmStoreByServer = (url) => {
        return this.realmStores[url];
    };

    setRealmStoreByServer = (url, store) => {
        this.realmStores[url] = store;
    };

    removeRealmStoreForServer = (url) => {
        Reflect.deleteProperty(this.realmStores, url);
    };
}

export default new EphemeralStore();
