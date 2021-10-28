// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EphemeralStore {
    allNavigationComponentIds: string[] = [];
    navigationComponentIdStack: string[] = [];
    navigationModalStack: string[] = [];
    theme: Theme | undefined;
    visibleTab = 'Home'

    addNavigationComponentId = (componentId: string) => {
        this.addToNavigationComponentIdStack(componentId);
        this.addToAllNavigationComponentIds(componentId);
    };

    addToAllNavigationComponentIds = (componentId: string) => {
        if (!this.allNavigationComponentIds.includes(componentId)) {
            this.allNavigationComponentIds.unshift(componentId);
        }
    }

    addToNavigationComponentIdStack = (componentId: string) => {
        const index = this.navigationComponentIdStack.indexOf(componentId);
        if (index >= 0) {
            this.navigationComponentIdStack = this.navigationComponentIdStack.slice(index, 1);
        }

        this.navigationComponentIdStack.unshift(componentId);
    }

    addNavigationModal = (componentId: string) => {
        this.navigationModalStack.unshift(componentId);
    }

    clearNavigationComponents = () => {
        this.navigationComponentIdStack = [];
        this.navigationModalStack = [];
        this.allNavigationComponentIds = [];
    };

    clearNavigationModals = () => {
        this.navigationModalStack = [];
    }

    getAllNavigationComponents = () => this.allNavigationComponentIds;

    getNavigationTopComponentId = () => {
        return this.navigationComponentIdStack[0];
    }

    getNavigationTopModalId = () => {
        return this.navigationModalStack[0];
    }

    getNavigationComponents = () => {
        return this.navigationComponentIdStack;
    }

    getVisibleTab = () => this.visibleTab;

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

    setVisibleTap = (tab: string) => {
        this.visibleTab = tab;
    }

    /**
     * Waits until a screen has been mounted and is part of the stack.
     * Use this function only if you know what you are doing
     * this function will run until the screen appears in the stack
     * and can easily run forever if the screen is never prevesented.
     * @param componentId string
     */
    waitUntilScreenHasLoaded = async (componentId: string) => {
        let found = false;
        while (!found) {
            // eslint-disable-next-line no-await-in-loop
            await (new Promise((r) => requestAnimationFrame(r)));

            found = this.navigationComponentIdStack.includes(componentId);
        }
    }

    /**
     * Waits until a screen has been removed as part of the stack.
     * Use this function only if you know what you are doing
     * this function will run until the screen disappears from the stack
     * and can easily run forever if the screen is never removed.
     * @param componentId string
     */
    waitUntilScreensIsRemoved = async (componentId: string) => {
        let found = false;
        while (!found) {
            // eslint-disable-next-line no-await-in-loop
            await (new Promise((r) => requestAnimationFrame(r)));

            found = !this.navigationComponentIdStack.includes(componentId);
        }
    }
}

export default new EphemeralStore();
