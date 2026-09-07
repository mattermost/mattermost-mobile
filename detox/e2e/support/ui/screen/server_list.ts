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
        addServerButton: 'server_list.add_a_server.button',
        tutorialHighlight: 'tutorial_highlight',
        tutorialSwipeLeft: 'tutorial_swipe_left',
    };

    serverListScreen = element(by.id(this.testID.serverListScreen));
    serverListTitle = element(by.id(this.testID.serverListTitle));

    // Footer label is what CI actually finds. The footer testID is not
    // visible on Android (MM-T4691_7 / MM-T4675_2 on 21ea481).
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
        if (isIos()) {
            await waitFor(this.tutorialHighlight).toExist().withTimeout(timeouts.TEN_SEC);
            await this.tutorialSwipeLeft.tap();
            await expect(this.tutorialHighlight).not.toExist();
            return;
        }
        await wait(timeouts.ONE_SEC);
        await device.pressBack();
        await wait(timeouts.ONE_SEC);
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

    swipeRevealOption = async (
        row: {atIndex: (index: number) => Detox.NativeElement},
        option: {atIndex: (index: number) => Detox.NativeElement},
    ) => {
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
        await revealed.tap({x: 1, y: 1});
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
