// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class NavigationStore {
    allNavigationComponentIds: string[] = [];
    navigationComponentIdStack: string[] = [];
    navigationModalStack: string[] = [];
    visibleTab = 'Home';
    tosOpen = false;

    setToSOpen = (open: boolean) => {
        this.tosOpen = open;
    };

    isToSOpen = () => {
        return this.tosOpen;
    };

    addNavigationComponentId = (componentId: string) => {
        this.addToNavigationComponentIdStack(componentId);
        this.addToAllNavigationComponentIds(componentId);
    };

    addToAllNavigationComponentIds = (componentId: string) => {
        if (!this.allNavigationComponentIds.includes(componentId)) {
            this.allNavigationComponentIds.unshift(componentId);
        }
    };

    addToNavigationComponentIdStack = (componentId: string) => {
        const index = this.navigationComponentIdStack.indexOf(componentId);
        if (index >= 0) {
            this.navigationComponentIdStack.splice(index, 1);
        }

        this.navigationComponentIdStack.unshift(componentId);
    };

    addNavigationModal = (componentId: string) => {
        this.navigationModalStack.unshift(componentId);
    };

    clearNavigationComponents = () => {
        this.navigationComponentIdStack = [];
        this.navigationModalStack = [];
        this.allNavigationComponentIds = [];
    };

    clearNavigationModals = () => {
        this.navigationModalStack = [];
    };

    getAllNavigationComponents = () => this.allNavigationComponentIds;

    getAllNavigationModals = () => this.navigationModalStack;

    getNavigationTopComponentId = () => {
        return this.navigationComponentIdStack[0];
    };

    getNavigationTopModalId = () => {
        return this.navigationModalStack[0];
    };

    getNavigationComponents = () => {
        return this.navigationComponentIdStack;
    };

    getVisibleTab = () => this.visibleTab;

    hasModalsOpened = () => this.navigationModalStack.length > 0;

    private removeNavigationComponent = (componentId: string) => {
        const index = this.allNavigationComponentIds.indexOf(componentId);
        if (index >= 0) {
            this.allNavigationComponentIds.splice(index, 1);
        }
    };

    removeNavigationComponentId = (componentId: string) => {
        this.removeNavigationComponent(componentId);
        const index = this.navigationComponentIdStack.indexOf(componentId);
        if (index >= 0) {
            this.navigationComponentIdStack.splice(index, 1);
        }
    };

    removeNavigationModal = (componentId: string) => {
        this.removeNavigationComponentId(componentId);
        const index = this.navigationModalStack.indexOf(componentId);

        if (index >= 0) {
            this.navigationModalStack.splice(index, 1);
        }
    };

    setVisibleTap = (tab: string) => {
        this.visibleTab = tab;
    };

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
    };

    /**
     * Waits until a passed screen is the top screen
     * Use this function only if you know what you are doing
     * this function will run until the screen is in the top
     * @param componentId string
     */
    waitUntilScreenIsTop = async (componentId: string) => {
        let found = false;
        while (!found) {
            // eslint-disable-next-line no-await-in-loop
            await (new Promise((r) => requestAnimationFrame(r)));

            found = this.getNavigationTopComponentId() === componentId;
        }
    };

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
    };
}

export default new NavigationStore();
