// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, waitForElementToExist, waitForElementToNotExist} from '@support/utils';

class ServerListScreen {
    testID = {
        serverListScreen: 'server_list.screen',
        serverListTitle: 'server_list.title',
        addServerButton: 'server_list.add_a_server.button',
        tutorialHighlight: 'tutorial_highlight',
        tutorialSwipeLeft: 'tutorial_swipe_left',
    };

    serverListScreen = element(by.id(this.testID.serverListScreen));
    serverListTitle = element(by.id(this.testID.serverListTitle));
    addServerButton = element(by.text('Add a server'));
    tutorialHighlight = element(by.id(this.testID.tutorialHighlight));
    tutorialSwipeLeft = element(by.id(this.testID.tutorialSwipeLeft));

    toServerItemTestIdPrefix = (serverDisplayName: string) => {
        return `server_list.server_item.${serverDisplayName.replace(/ /g, '_').toLocaleLowerCase()}`;
    };

    getServerItemActive = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.active`));
    };

    getServerItemInactive = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.inactive`));
    };

    getServerItemServerIcon = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.server_icon`));
    };

    getServerItemEditOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.options.edit.option`));
    };

    getServerItemRemoveOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.options.remove.option`));
    };

    getServerItemLoginOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.options.login.option`));
    };

    getServerItemLogoutOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.options.logout.option`));
    };

    toBeVisible = async () => {
        await waitForElementToExist(this.serverListScreen, timeouts.HALF_MIN);

        return this.serverListScreen;
    };

    open = async () => {
        // # Open server list screen
        // On iOS 26 the server icon may not pass the 100% visibility threshold
        // (bottom-sheet transition chrome clips the view). Use
        // disableSynchronization to bypass the hittability probe.
        await device.disableSynchronization();
        try {
            await ChannelListScreen.serverIcon.tap();
        } finally {
            await device.enableSynchronization();
        }
        if (isAndroid()) {
            await this.closeTutorial();
        }

        return this.toBeVisible();
    };

    close = async () => {
        if (isIos()) {
            await this.serverListScreen.swipe('down');
        } else {
            await device.pressBack();
        }
        await waitForElementToNotExist(this.serverListScreen, timeouts.TEN_SEC);
    };

    closeTutorial = async () => {
        try {
            if (isIos()) {
                await waitFor(this.tutorialHighlight).toExist().withTimeout(timeouts.TEN_SEC);
                await this.tutorialSwipeLeft.tap();
            } else {
                await waitForElementToExist(this.tutorialSwipeLeft, timeouts.TEN_SEC);
                await device.pressBack();
            }
            await waitFor(this.tutorialHighlight).not.toExist().withTimeout(timeouts.TEN_SEC);
        } catch {
            // Tutorial may not appear if already dismissed in a previous run
        }
    };

    // On iOS 26, swipe-revealed action buttons and bottom-sheet items may not pass
    // the 100% hittability threshold. This helper disables synchronization around
    // the tap so Detox bypasses the visibility probe.
    tapItem = async (item: Detox.NativeElement) => {
        if (isIos()) {
            await device.disableSynchronization();
        }
        try {
            await item.tap();
        } finally {
            if (isIos()) {
                await device.enableSynchronization();
            }
        }
    };
}

const serverListScreen = new ServerListScreen();
export default serverListScreen;
