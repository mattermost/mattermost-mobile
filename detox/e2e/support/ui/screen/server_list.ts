// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect} from 'detox';

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
        // On Android, the server list bottom sheet uses @gorhom/bottom-sheet which
        // keeps the mqt_js bridge thread busy during animation. waitFor().toExist()
        // uses bridge-idle sync and blocks until the JS thread is idle, which never
        // resolves on Android CI, causing a 30s+ timeout even when the screen IS open.
        //
        // Additionally the tutorial overlay ("Swipe left…") can cover the screen,
        // causing toBeVisible() to fail the 50% threshold even when the element exists.
        //
        // waitForElementToExist() polls expect().toExist() directly, bypassing both
        // the bridge-sync blockage and the visibility-threshold issue.
        //
        // iOS uses the standard bridge-sync waitFor() path.
        if (isAndroid()) {
            await waitForElementToExist(this.serverListScreen, timeouts.HALF_MIN);
        } else {
            await waitFor(this.serverListScreen).toExist().withTimeout(timeouts.HALF_MIN);
        }

        return this.serverListScreen;
    };

    open = async () => {
        // # Open server list screen
        await ChannelListScreen.serverIcon.tap();

        // On Android, the tutorial ("Swipe left on a server…") is a <Modal> that
        // renders inside the server list bottom sheet. When the Modal is visible,
        // Android's accessibility tree exposes only the Modal's contents, hiding
        // all other elements including server_list.screen from Detox. We must
        // dismiss the tutorial first (via pressBack on Android) before server_list.screen
        // becomes findable. The tutorial is safe to dismiss here because closeTutorial()
        // wraps in a try/catch and is a no-op if the tutorial is not showing.
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
        await wait(timeouts.ONE_SEC);
        await expect(this.serverListScreen).not.toBeVisible();
        await wait(timeouts.ONE_SEC);
    };

    closeTutorial = async () => {
        try {
            if (isIos()) {
                await waitFor(this.tutorialHighlight).toExist().withTimeout(timeouts.TEN_SEC);
                await this.tutorialSwipeLeft.tap();
            } else {
                // On Android, the tutorial is a <Modal> (testID=tutorial_highlight on the
                // Modal element). Android's accessibility tree exposes the Modal's inner
                // content, and tutorialSwipeLeft (testID=tutorial_swipe_left) appears as
                // a resource-id in the hierarchy. Use that to detect the tutorial.
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
