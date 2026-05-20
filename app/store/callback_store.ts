// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class CallbackStoreSingleton {
    private callback?: any;

    public setCallback<T>(callback: T) {
        this.callback = callback;
    }

    public getCallback<T>(): T | undefined {
        return this.callback;
    }

    public removeCallback() {
        this.callback = undefined;
    }
}

const CallbackStore = new CallbackStoreSingleton();
export default CallbackStore;
