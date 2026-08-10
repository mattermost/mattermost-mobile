// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

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
    swipeTutorialText = element(by.text('Swipe left on a server to see more actions'));

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

    // RN Modal with pointerEvents='none' on the illustration; only hardware Back dismisses it.
    // Press Back exactly once, and only while the tutorial text is present.
    dismissSwipeTutorial = async () => {
        try {
            await waitFor(this.swipeTutorialText).toBeVisible().withTimeout(timeouts.THREE_SEC);
            await device.pressBack();
            await waitFor(this.swipeTutorialText).not.toExist().withTimeout(timeouts.FIVE_SEC);
        } catch {
            // Tutorial not shown or already dismissed.
        }
    };

    toBeVisible = async () => {
        // On Android the swipe tutorial is a RN Modal (separate Dialog window). Espresso
        // searches that focused window, so server_list.screen appears missing until dismissed.
        if (isAndroid()) {
            await this.dismissSwipeTutorial();
            await waitForElementToExist(this.serverListScreen, timeouts.TEN_SEC);
        } else {
            await waitFor(this.serverListScreen).toExist().withTimeout(timeouts.TEN_SEC);
            await this.closeTutorial();
        }
        return this.serverListScreen;
    };

    open = async () => {
        await dismissKnownModals(2);
        const iconTimeout = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC;
        await waitForElementToExist(ChannelListScreen.serverIcon, iconTimeout);

        /* eslint-disable no-await-in-loop -- retry server icon tap while header overlay clears */
        for (let i = 0; i < 3; i++) {
            try {
                await ChannelListScreen.serverIcon.tap();
                break;
            } catch (err) {
                if (i === 2) {
                    throw err;
                }
                await wait(timeouts.ONE_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */

        await this.toBeVisible();
        return this.serverListScreen;
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
                await waitFor(this.tutorialHighlight).not.toExist().withTimeout(timeouts.TEN_SEC);
            } else {
                // Guarded pressBack — a blind pressBack dismisses server_list underneath.
                await this.dismissSwipeTutorial();
            }
        } catch {
            // Tutorial already dismissed or not shown for this account.
        }
    };
}

const serverListScreen = new ServerListScreen();
export default serverListScreen;
