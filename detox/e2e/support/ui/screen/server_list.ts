// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, isIos, scrollElementIntoView, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
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
            await waitFor(this.serverListScreen).toExist().withTimeout(timeouts.TEN_SEC);
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

    // Server rows are variable height. server_item renders a push-proxy alert line
    // ("Notifications cannot be received from this server because of its configuration…")
    // only for servers whose push proxy is unverified, and that status is per-server and
    // resolved at runtime — so the same row sits on screen for one server set and below
    // the fold for another. Never assume a row is already visible: scroll the inner
    // server_list FlatList until it is. No-op when the row is already on screen.
    //
    // scrollElementIntoView, not a bare whileElement().scroll(): whileElement takes a
    // single direction, and 'down' cannot recover a row that is clipped at the *top* —
    // which is exactly where the first server sits after revealServerListItems() scrolls
    // the sheet's list down, and what MM-T4691_4's own comment records ("the row sat
    // clipped at the top of the sheet (y=0, height=252)"). Scrolling further down walks
    // it further away, so the visibility check just thrashes: ios shard 18 of run
    // 32184155037 logged nine DETOX_VISIBILITY_RCTViewComponentView__*__SCREEN.png debug
    // captures for MM-T4691_4 before the row interaction failed. scrollElementIntoView
    // already alternates both directions and applies the per-platform threshold.
    scrollServerItemIntoView = async (item: Detox.NativeElement) => {
        await scrollElementIntoView(item, by.id(this.testID.serverList));
    };

    swipeRevealOption = async (
        row: {atIndex: (index: number) => Detox.NativeElement},
        option: {atIndex: (index: number) => Detox.NativeElement},
    ) => {
        const target = row.atIndex(0);
        await this.scrollServerItemIntoView(target);

        const revealed = option.atIndex(0);
        /* eslint-disable no-await-in-loop -- swipe can be a no-op until the row is fully on-screen */
        for (let attempt = 0; attempt < 3; attempt++) {
            await target.swipe('left', 'slow');
            try {
                await waitForElementToExist(revealed, timeouts.FOUR_SEC);
                break;
            } catch {
                if (attempt === 2) {
                    throw new Error('Server list swipe did not reveal the action option');
                }
                await this.scrollServerItemIntoView(target);
            }
        }
        /* eslint-enable no-await-in-loop */

        // Fan-out animation: wait briefly, then require existence rather than 75%
        // visibility — logout/remove sit in an Animated clip (MM-T4691_6).
        await wait(timeouts.ONE_SEC);
        if (isAndroid()) {
            await waitForElementToBeVisible(revealed, timeouts.TEN_SEC);
        }
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
        // Pick the matcher with toExist(), which is scroll-independent, so the choice is
        // made before any scrolling; then scroll that row into view and corner-tap it.
        let target = this.getServerItemInactive(serverDisplayName).atIndex(0);
        try {
            await waitForElementToExist(target, timeouts.FOUR_SEC);
        } catch {
            target = this.getServerItemActive(serverDisplayName).atIndex(0);
            await waitForElementToExist(target, timeouts.FOUR_SEC);
        }
        await this.scrollServerItemIntoView(target);
        await target.tap({x: 1, y: 1});

        try {
            await waitFor(this.serverListScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
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
