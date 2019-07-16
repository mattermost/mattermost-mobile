// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EphemeralStore {
    constructor() {
        this.appStarted = false;
        this.appStartedFromPushNotification = false;
        this.deviceToken = null;
        this.componentIdStack = [];
        this.currentServerUrl = null;
        this.realmStores = {};
    }

    getTopComponentId = () => this.componentIdStack[0];

    addComponentIdToStack = (componentId) => {
        this.componentIdStack.unshift(componentId);
    };

    removeComponentIdFromStack = (componentId) => {
        this.componentIdStack = this.componentIdStack.filter((id) => {
            return id !== componentId;
        });
    };

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
