// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class ServerListScreen {
    testID = {
        serverListScreen: 'server_list.screen',
        serverListTitle: 'server_list.title',
        addServerButton: 'servers.create_button',
        tutorialHighlight: 'tutorial_highlight',
        tutorialSwipeLeft: 'tutorial_swipe_left',
    };

    serverListScreen = element(by.id(this.testID.serverListScreen));
    serverListTitle = element(by.id(this.testID.serverListTitle));
    addServerButton = element(by.id(this.testID.addServerButton));
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
        if (isIos()) {
            await waitFor(this.serverListScreen).toExist().withTimeout(timeouts.TEN_SEC);
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
            await waitFor(this.tutorialHighlight).toExist().withTimeout(timeouts.TWO_SEC);
        } catch {
            return;
        }

        // SVG overlay mounts only after measure(); swipe tooltip is a sibling.
        try {
            await waitFor(this.tutorialSwipeLeft).toExist().withTimeout(timeouts.TEN_SEC);
        } catch {
            // Still try the modal tap if bounds have not measured.
        }

        // tutorial_swipe_left is pointerEvents=none. Dismiss is on the Modal /
        // highlight SVG (MM-T4675_2 CI: overlay still up when asserting Logout).
        await this.tutorialHighlight.tap({x: 10, y: 10});
        await waitFor(this.tutorialHighlight).not.toExist().withTimeout(timeouts.TEN_SEC);
    };

    scrollServerListIntoView = async () => {
        if (isIos()) {
            await this.serverListTitle.swipe('up', 'fast', 0.3, 0.5, 0.5);
            return;
        }
        if (isAndroid()) {
            await waitForElementToBeVisible(this.serverListTitle, timeouts.TWO_SEC);
            await this.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }
    };

    // Revealed swipe actions sit in an Animated clip. Detox visibility % times
    // out while the control is present and tappable (MM-T4675_2 / SEC-11017).
    swipeRevealOption = async (
        row: {atIndex: (index: number) => Detox.NativeElement},
        option: {atIndex: (index: number) => Detox.NativeElement},
    ) => {
        await this.closeTutorial();
        await row.atIndex(0).swipe('left', 'slow');
        const revealed = option.atIndex(0);
        await waitForElementToExist(revealed, timeouts.TEN_SEC);
        return revealed;
    };

    swipeRevealAndTapOption = async (
        row: {atIndex: (index: number) => Detox.NativeElement},
        option: {atIndex: (index: number) => Detox.NativeElement},
    ) => {
        const revealed = await this.swipeRevealOption(row, option);
        try {
            await revealed.tap();
        } catch (error) {
            const msg = String(error);
            if (!msg.includes('hittable') && !msg.includes('not visible')) {
                throw error;
            }
            await revealed.tap({x: 1, y: 1});
        }
    };

    switchToServer = async (serverDisplayName: string) => {
        const inactive = this.getServerItemInactive(serverDisplayName);
        const active = this.getServerItemActive(serverDisplayName);
        try {
            await waitForElementToExist(inactive, timeouts.FOUR_SEC);
            await inactive.atIndex(0).tap();
        } catch {
            await waitForElementToExist(active, timeouts.FOUR_SEC);
            await active.atIndex(0).tap();
        }
        await waitFor(ChannelListScreen.headerServerDisplayName).
            toHaveText(serverDisplayName).
            withTimeout(timeouts.HALF_MIN);
    };
}

const serverListScreen = new ServerListScreen();
export default serverListScreen;
