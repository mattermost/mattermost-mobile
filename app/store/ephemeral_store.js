// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EphemeralStore {
    constructor() {
        this.appStarted = false;
        this.appStartedFromPushNotification = false;
        this.deviceToken = null;
        this.currentServerUrl = null;
        this.realmStores = {};
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
    }
}

export default new EphemeralStore();
