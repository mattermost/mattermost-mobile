// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EphemeralStore {
    constructor() {
        this.componentIdStack = [];
    }

    getTopComponentId = () => this.componentIdStack[0];

    addComponentIdToStack = (componentId) => {
        this.componentIdStack.unshift(componentId);
    }

    removeComponentIdFromStack = (componentId) => {
        this.componentIdStack = this.componentIdStack.filter((id) => {
            return id !== componentId;
        });
    }
}

export default new EphemeralStore();
