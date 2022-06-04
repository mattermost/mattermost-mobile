// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EphemeralStore {
    allNavigationComponentIds: string[] = [];
    navigationComponentIdStack: string[] = [];
    navigationModalStack: string[] = [];
    theme: Theme | undefined;
    visibleTab = 'Home';
    creatingChannel = false;
    creatingDMorGMTeammates: string[] = [];

    private pushProxyVerification: {[x: string]: string | undefined} = {};

    // As of today, the server sends a duplicated event to add the user to the team.
    // If we do not handle this, this ends up showing some errors in the database, apart
    // of the extra computation time. We use this to track the events that are being handled
    // and make sure we only handle one.
    private addingTeam = new Set<string>();
    private joiningChannels = new Set<string>();
    private leavingChannels = new Set<string>();
    private archivingChannels = new Set<string>();
    private convertingChannels = new Set<string>();
    private lastViewedThreadId = '';

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

    // Ephemeral control when (un)archiving a channel locally
    addArchivingChannel = (channelId: string) => {
        this.archivingChannels.add(channelId);
    };

    isArchivingChannel = (channelId: string) => {
        return this.archivingChannels.has(channelId);
    };

    removeArchivingChannel = (channelId: string) => {
        this.archivingChannels.delete(channelId);
    };

    // Ephemeral control when converting a channel to private locally
    addConvertingChannel = (channelId: string) => {
        this.convertingChannels.add(channelId);
    };

    isConvertingChannel = (channelId: string) => {
        return this.convertingChannels.has(channelId);
    };

    removeConvertingChannel = (channelId: string) => {
        this.convertingChannels.delete(channelId);
    };

    // Ephemeral control when leaving a channel locally
    addLeavingChannel = (channelId: string) => {
        this.leavingChannels.add(channelId);
    };

    isLeavingChannel = (channelId: string) => {
        return this.leavingChannels.has(channelId);
    };

    removeLeavingChannel = (channelId: string) => {
        this.leavingChannels.delete(channelId);
    };

    // Ephemeral control when joining a channel locally
    addJoiningChannel = (channelId: string) => {
        this.joiningChannels.add(channelId);
    };

    isJoiningChannel = (channelId: string) => {
        return this.joiningChannels.has(channelId);
    };

    removeJoiningChannel = (channelId: string) => {
        this.joiningChannels.delete(channelId);
    };

    // Ephemeral control when adding a team locally
    startAddingToTeam = (teamId: string) => {
        this.addingTeam.add(teamId);
    };

    finishAddingToTeam = (teamId: string) => {
        this.addingTeam.delete(teamId);
    };

    isAddingToTeam = (teamId: string) => {
        return this.addingTeam.has(teamId);
    };

    // Ephemeral for push proxy state
    setPushProxyVerificationState = (serverUrl: string, state: string) => {
        this.pushProxyVerification[serverUrl] = state;
    };

    getPushProxyVerificationState = (serverUrl: string) => {
        return this.pushProxyVerification[serverUrl];
    };

    // Ephemeral for the last viewed thread
    getLastViewedThreadId = () => {
        return this.lastViewedThreadId;
    };

    setLastViewedThreadId = (id: string) => {
        this.lastViewedThreadId = id;
    };
}

export default new EphemeralStore();
