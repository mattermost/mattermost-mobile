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

        // The scrollable FlatList holding the server rows. NOT 'server_list' — that id goes
        // to BottomSheetContent, which renders it as `${testID}.screen` (content.tsx:69) on
        // a plain, non-scrollable View. Same .screen trap as draft_options and post_list.
        serverList: 'server_list.flat_list',
        addServerButton: 'server_list.add_a_server.button',
        tutorialHighlight: 'tutorial_highlight',
        tutorialSwipeLeft: 'tutorial_swipe_left',
    };

    serverListScreen = element(by.id(this.testID.serverListScreen));
    serverListTitle = element(by.id(this.testID.serverListTitle));
    serverList = element(by.id(this.testID.serverList));

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
            // Existence is not presentation. The sheet's view stays in the hierarchy while
            // it is dismissed, so an existence-only wait let open() report success with the
            // app still on the channel list — and swipeRevealOption then swiped a row that
            // was nowhere on screen. Proven by testFnFailure.png for MM-T4691_4 in CI run
            // 32543957273: the screenshot at the moment of failure is the channel list, and
            // the edit option's frame was RNGH's closed translate (x = -10000 + row x).
            await waitForElementToExist(this.serverListScreen, timeouts.TEN_SEC);
            await waitForElementToBeVisible(this.serverListScreen, timeouts.TEN_SEC);
        }

        return this.serverListScreen;
    };

    open = async () => {
        await dismissKnownModals(2);

        // Switching servers from the sheet does not always dismiss it, and on iOS the
        // sheet is its own window — `channel_list.servers.server_icon` behind it is then
        // unmatchable and the wait below times out with the list already on screen
        // (MM-T4675_2, ios-results-gl6zupuras-7). Treat an open sheet as already open.
        try {
            await waitFor(this.serverListScreen).toExist().withTimeout(timeouts.TWO_SEC);
            return this.serverListScreen;
        } catch {
            // Sheet is closed — open it from the channel list header below.
        }

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
        try {
            await expect(this.serverListScreen).toExist();
        } catch {
            return;
        }

        try {
            if (isIos()) {
                await this.serverListScreen.swipe('down');
            } else {
                await device.pressBack();
            }
        } catch {
            // The sheet may have completed its own dismissal after the existence check.
        }
        await waitFor(this.serverListScreen).not.toExist().withTimeout(timeouts.TEN_SEC);
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

    scrollServerItemIntoView = async (item: Detox.NativeElement) => {
        const maxScrolls = isIos() ? 10 : 5;
        const scrollAmount = isIos() ? 40 : 120;
        const visibilityThreshold = isIos() ? 95 : 75;
        try {
            await this.serverList.scrollTo('top');
        } catch {
            // The list may already be at its boundary.
        }

        /* eslint-disable no-await-in-loop -- bounded scan of the server FlatList */
        for (let attempt = 0; attempt < maxScrolls; attempt++) {
            try {
                await expect(item).toBeVisible(visibilityThreshold);
                return;
            } catch (error) {
                if (attempt === maxScrolls - 1) {
                    throw error;
                }
                try {
                    // iOS reports the list's full 464pt frame even when the collapsed
                    // sheet exposes only its top ~114pt. A 40pt gesture beginning 10%
                    // down stays inside that visible slice.
                    await this.serverList.scroll(scrollAmount, 'down', 0.5, isIos() ? 0.1 : 0.5);
                } catch {
                    // The list may already be at its boundary.
                }
            }
        }
        /* eslint-enable no-await-in-loop */
    };

    getServerItem = async (serverDisplayName: string) => {
        const inactive = this.getServerItemInactive(serverDisplayName).atIndex(0);
        try {
            await expect(inactive).toExist();
            return inactive;
        } catch {
            const active = this.getServerItemActive(serverDisplayName).atIndex(0);
            await waitForElementToExist(active, timeouts.FOUR_SEC);
            return active;
        }
    };

    isOptionHittable = async (option: Detox.NativeElement) => {
        try {
            const attributes = await option.getAttributes();
            if (!('visible' in attributes) || !attributes.visible) {
                return false;
            }
            if (isIos()) {
                return 'hittable' in attributes && attributes.hittable;
            }
            return true;
        } catch {
            return false;
        }
    };

    swipeRevealOption = async (
        serverDisplayName: string,
        option: {atIndex: (index: number) => Detox.NativeElement},
    ) => {
        const revealed = option.atIndex(0);
        if (await this.isOptionHittable(revealed)) {
            return revealed;
        }

        /* eslint-disable no-await-in-loop -- a row press can win the iOS swipe gesture */
        for (let attempt = 0; attempt < 3; attempt++) {
            // Swiping a row inside a sheet that is not presented cannot reveal anything, and
            // the resulting "swipe did not reveal the action option" sends the reader after a
            // gesture problem that is not there. Confirm presentation first and say so.
            await this.toBeVisible();

            const target = await this.getServerItem(serverDisplayName);
            await this.scrollServerItemIntoView(target);
            try {
                if (await this.isOptionHittable(revealed)) {
                    return revealed;
                }
                await target.swipe('left', 'fast', 0.5, 0.9, 0.5);
                await expect(this.serverListScreen).toBeVisible();
                if (await this.isOptionHittable(revealed)) {
                    return revealed;
                }
                throw new Error('Server option remained unhittable after swipe');
            } catch (error) {
                if (attempt === 2) {
                    throw new Error(`Server list swipe did not reveal the action option for "${serverDisplayName}": ${(error as Error)?.message ?? error}`);
                }
                await this.open();
            }
        }
        /* eslint-enable no-await-in-loop */
        throw new Error(`Server list swipe did not reveal the action option for "${serverDisplayName}"`);
    };

    swipeRevealAndTapOption = async (
        serverDisplayName: string,
        option: {atIndex: (index: number) => Detox.NativeElement},
    ) => {
        const revealed = await this.swipeRevealOption(serverDisplayName, option);
        if (isIos()) {
            if (!await this.isOptionHittable(revealed)) {
                throw new Error('Server option became unhittable before tap');
            }
        } else {
            await waitForElementToBeVisible(revealed, timeouts.TEN_SEC);
        }
        await revealed.tap();
    };

    switchToServer = async (serverDisplayName: string) => {
        const target = await this.getServerItem(serverDisplayName);
        await this.scrollServerItemIntoView(target);
        await target.tap({x: 36, y: 36});

        try {
            await waitFor(this.serverListScreen).not.toExist().withTimeout(timeouts.FOUR_SEC);
        } catch {
            await this.close();
        }

        await waitFor(ChannelListScreen.headerServerDisplayName).
            toHaveText(serverDisplayName).
            withTimeout(timeouts.HALF_MIN);
    };
}

const serverListScreen = new ServerListScreen();
export default serverListScreen;
