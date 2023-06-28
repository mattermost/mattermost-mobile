// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AvailableScreens} from '@typings/screens/navigation';

class NavigationStore {
    private screensInStack: AvailableScreens[] = [];
    private modalsInStack: AvailableScreens[] = [];
    private visibleTab = 'Home';
    private tosOpen = false;

    reset = () => {
        this.screensInStack = [];
        this.modalsInStack = [];
        this.visibleTab = 'Home';
        this.tosOpen = false;
    };

    addModalToStack = (modalId: AvailableScreens) => {
        this.removeModalFromStack(modalId);
        this.addScreenToStack(modalId);
        this.modalsInStack.unshift(modalId);
    };

    addScreenToStack = (screenId: AvailableScreens) => {
        this.removeScreenFromStack(screenId);
        this.screensInStack.unshift(screenId);
    };

    clearScreensFromStack = () => {
        this.screensInStack = [];
    };

    getModalsInStack = () => this.modalsInStack;

    getScreensInStack = () => this.screensInStack;

    getVisibleModal = () => this.modalsInStack[0];

    getVisibleScreen = () => this.screensInStack[0];

    getVisibleTab = () => this.visibleTab;

    hasModalsOpened = () => this.modalsInStack.length > 0;

    isToSOpen = () => this.tosOpen;

    popTo = (screenId: AvailableScreens) => {
        const index = this.screensInStack.indexOf(screenId);
        if (index > -1) {
            this.screensInStack.splice(0, index);
        }
    };

    removeScreenFromStack = (screenId: AvailableScreens) => {
        const index = this.screensInStack.indexOf(screenId);
        if (index > -1) {
            this.screensInStack.splice(index, 1);
        }
    };

    removeModalFromStack = (modalId: AvailableScreens) => {
        const indexInStack = this.screensInStack.indexOf(modalId);
        if (indexInStack > -1) {
            // This removes all the screens that were on top of the modal
            this.screensInStack.splice(0, indexInStack + 1);
        }

        const index = this.modalsInStack.indexOf(modalId);
        if (index > -1) {
            this.modalsInStack.splice(index, 1);
        }
    };

    setToSOpen = (open: boolean) => {
        this.tosOpen = open;
    };

    setVisibleTap = (tab: string) => {
        this.visibleTab = tab;
    };

    /**
     * Waits until a screen has been mounted and is part of the stack.
     * Use this function only if you know what you are doing
     * this function will run until the screen appears in the stack
     * and can easily run forever if the screen is never prevesented.
     * @param screenId string
     */
    waitUntilScreenHasLoaded = async (screenId: AvailableScreens) => {
        let found = false;
        while (!found) {
            // eslint-disable-next-line no-await-in-loop
            await (new Promise((r) => requestAnimationFrame(r)));

            found = this.screensInStack.includes(screenId);
        }
    };

    /**
     * Waits until a passed screen is the top screen
     * Use this function only if you know what you are doing
     * this function will run until the screen is in the top
     * @param screenId string
     */
    waitUntilScreenIsTop = async (screenId: AvailableScreens) => {
        let found = false;
        while (!found) {
            // eslint-disable-next-line no-await-in-loop
            await (new Promise((r) => requestAnimationFrame(r)));

            found = this.getVisibleScreen() === screenId;
        }
    };

    /**
     * Waits until a screen has been removed as part of the stack.
     * Use this function only if you know what you are doing
     * this function will run until the screen disappears from the stack
     * and can easily run forever if the screen is never removed.
     * @param screenId string
     */
    waitUntilScreensIsRemoved = async (screenId: AvailableScreens) => {
        let found = false;
        while (!found) {
            // eslint-disable-next-line no-await-in-loop
            await (new Promise((r) => setTimeout(r, 250)));

            found = !this.screensInStack.includes(screenId);
        }
    };
}

export default new NavigationStore();
