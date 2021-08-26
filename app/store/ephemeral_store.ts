// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EphemeralStore {
    allNavigationComponentIds: string[] = [];
    navigationComponentIdStack: string[] = [];
    navigationModalStack: string[] = [];
    theme: Theme | undefined;

    getNavigationTopComponentId = () => {
        return this.navigationComponentIdStack[0];
    }

    clearNavigationComponents = () => {
        this.navigationComponentIdStack = [];
        this.navigationModalStack = [];
        this.allNavigationComponentIds = [];
    };

    clearNavigationModals = () => {
        this.navigationModalStack = [];
    }

    addNavigationComponentId = (componentId: string) => {
        this.addToNavigationComponentIdStack(componentId);
        this.addToAllNavigationComponentIds(componentId);
    };

    addNavigationModal = (componentId: string) => {
        this.navigationModalStack.unshift(componentId);
    }

    addToNavigationComponentIdStack = (componentId: string) => {
        const index = this.navigationComponentIdStack.indexOf(componentId);
        if (index >= 0) {
            this.navigationComponentIdStack = this.navigationComponentIdStack.slice(index, 1);
        }

        this.navigationComponentIdStack.unshift(componentId);
    }

    addToAllNavigationComponentIds = (componentId: string) => {
        if (!this.allNavigationComponentIds.includes(componentId)) {
            this.allNavigationComponentIds.unshift(componentId);
        }
    }

    hasModalsOpened = () => this.navigationModalStack.length > 0;

    removeNavigationComponentId = (componentId: string) => {
        const index = this.navigationComponentIdStack.indexOf(componentId);
        if (index >= 0) {
            this.navigationComponentIdStack.splice(index, 1);
        }
    }

    removeNavigationModal = (componentId: string) => {
        const index = this.navigationModalStack.indexOf(componentId);

        if (index >= 0) {
            this.navigationModalStack.splice(index, 1);
        }
    }
}

export default new EphemeralStore();
