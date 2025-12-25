// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class CustomStatusSingleton {
    private clearAfterCallback: ((duration: CustomStatusDuration, expiresAt: string) => void) | null = null;

    public setClearAfterCallback(callback: (duration: CustomStatusDuration, expiresAt: string) => void) {
        this.clearAfterCallback = callback;
    }

    public getClearAfterCallback() {
        return this.clearAfterCallback;
    }

    public removeClearAfterCallback() {
        this.clearAfterCallback = null;
    }
}

const CustomStatusStore = new CustomStatusSingleton();
export default CustomStatusStore;
