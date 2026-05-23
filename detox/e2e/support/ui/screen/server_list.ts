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
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.edit.option`));
    };

    getServerItemRemoveOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.remove.option`));
    };

    getServerItemLoginOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.login.option`));
    };

    getServerItemLogoutOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.logout.option`));
    };

    toBeVisible = async () => {
        await waitForElementToExist(this.serverListScreen, timeouts.HALF_MIN);

        return this.serverListScreen;
    };

    open = async () => {
        // # Open server list screen
        await ChannelListScreen.serverIcon.tap();
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
}

const serverListScreen = new ServerListScreen();
export default serverListScreen;
