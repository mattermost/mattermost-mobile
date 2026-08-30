// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

const TUTORIAL_DISMISS_POINT = {x: 40, y: 140};

class ServerListScreen {
    testID = {
        serverListScreen: 'server_list.screen',
        serverListTitle: 'server_list.title',
        serverList: 'server_list.flat_list',
        addServerButton: 'server_list.add_a_server.button',
        tutorialHighlight: 'tutorial_highlight',
        tutorialSwipeLeft: 'tutorial_swipe_left',
        tutorialBackdrop: 'tutorial_highlight.backdrop',
    };

    serverListScreen = element(by.id(this.testID.serverListScreen));
    serverListTitle = element(by.id(this.testID.serverListTitle));
    serverList = element(by.id(this.testID.serverList));

    // Footer label is what CI actually finds. The footer testID is not
    // visible on Android (MM-T4691_7 / MM-T4675_2 on 21ea481).
    addServerButton = element(by.text('Add a server'));
    tutorialHighlight = element(by.id(this.testID.tutorialHighlight));
    tutorialSwipeLeft = element(by.id(this.testID.tutorialSwipeLeft));
    tutorialBackdrop = element(by.id(this.testID.tutorialBackdrop));

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
            await waitForElementToExist(this.serverListScreen, timeouts.TEN_SEC);

            /* eslint-disable no-await-in-loop -- bounded retry: only re-throw when the tutorial is genuinely blocking */
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await waitForElementToBeVisible(this.serverListTitle, timeouts.FOUR_SEC);
                    return this.serverListScreen;
                } catch (error) {
                    // Only retry when a tutorial was actually there and went away. Any
                    // other reason the sheet is not visible is a real failure and is
                    // rethrown with its original message.
                    if (attempt === 2 || !(await this.dismissTutorialIfPresent())) {
                        throw error;
                    }
                }
            }
            /* eslint-enable no-await-in-loop */
        }

        return this.serverListScreen;
    };

    open = async () => {
        await dismissKnownModals(2);

        try {
            await waitForElementToBeVisible(this.serverListTitle, timeouts.TWO_SEC);
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

    dismissTutorialIfPresent = async (): Promise<boolean> => {
        try {
            await waitFor(this.tutorialHighlight).toExist().withTimeout(timeouts.TWO_SEC);
        } catch {
            // Not shown on this install, or already watched — storeMultiServerTutorial()
            // persists the flag on first dismissal.
            return false;
        }

        const attempts: Array<() => Promise<void>> = [
            () => this.tutorialBackdrop.tap(TUTORIAL_DISMISS_POINT),
            () => this.tutorialBackdrop.tap(),
            () => this.tutorialHighlight.tap(TUTORIAL_DISMISS_POINT),
            () => this.tutorialHighlight.tap(),
        ];

        /* eslint-disable no-await-in-loop -- bounded fallback chain: each dismiss target must run before the next */
        for (const attempt of attempts) {
            try {
                await attempt();
                await waitFor(this.tutorialHighlight).not.toExist().withTimeout(timeouts.FIVE_SEC);
                return true;
            } catch {
                // Try the next dismiss target.
            }
        }
        /* eslint-enable no-await-in-loop */

        return false;
    };

    closeTutorial = async () => {
        if (isIos()) {
            // open() dismisses the tutorial as part of its visibility wait, so by the time
            // a spec calls this the Modal is usually already gone. Absence is not failure.
            await this.dismissTutorialIfPresent();
            return;
        }
        await wait(timeouts.ONE_SEC);
        await device.pressBack();
        await wait(timeouts.ONE_SEC);
    };

    scrollServerListIntoView = async () => {
        if (isIos()) {
            /* eslint-disable no-await-in-loop -- retry the swipe around tutorial dismissal */
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await this.serverListTitle.swipe('up', 'fast', 0.3, 0.5, 0.5);
                    return;
                } catch (error) {
                    if (attempt === 2 || !(await this.dismissTutorialIfPresent())) {
                        throw error;
                    }
                    await wait(timeouts.ONE_SEC);
                }
            }
            /* eslint-enable no-await-in-loop */
        }
        if (isAndroid()) {
            await waitForElementToBeVisible(this.serverListTitle, timeouts.TWO_SEC);
            await this.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }
    };

    tapAddServerButton = async () => {
        /* eslint-disable no-await-in-loop -- retry the tap around tutorial dismissal */
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await this.addServerButton.tap();
                return;
            } catch (error) {
                if (attempt === 2 || !(await this.dismissTutorialIfPresent())) {
                    throw error;
                }
                await wait(timeouts.ONE_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */
    };

    scrollServerItemIntoView = async (item: Detox.NativeElement) => {
        const maxScrolls = isIos() ? 10 : 5;
        const scrollAmount = isIos() ? 40 : 120;
        // Detox's default visibility threshold is 75%, which is what Android uses here and
        // what every one of these flows passes at. The iOS 95% was stricter than the default
        // and is what MM-T4691_5/_6/_7 and MM-T4675_2 timed out on: with three servers the
        // sheet's max snap point already fits the whole list (SERVER_ITEM_HEIGHT * n +
        // chrome, see channel_list/servers/index.tsx), so the rows are never below the fold
        // and no amount of scrolling below can help -- the row is simply clipped a few
        // percent by the sheet's rounded edge and never reaches 95. Nothing is weakened by
        // matching Android: this helper only brings a row on screen, and every caller
        // re-checks `isOptionHittable` (iOS `hittable`) before it taps.
        const visibilityThreshold = 75;
        let lastError: unknown;
        try {
            await this.serverList.scrollTo('top');
        } catch {
            // The list may already be at its boundary.
        }

        /* eslint-disable no-await-in-loop -- bounded scan of the server FlatList */
        for (let attempt = 0; attempt < maxScrolls; attempt++) {
            try {
                // waitFor, not a bare expect: the sheet animates in and the rows re-render
                // after a server switch, and an instant assertion loses that race. Every one
                // of the ten attempts used to resolve in milliseconds, so the whole loop
                // finished inside the presentation animation. MM-T4675_2's Detox visibility
                // dump caught it exactly there — the row half-drawn and clipped by the
                // sheet's edge — and reported "clipped by one or more of its superviews'
                // bounds". Scrolling could never have fixed that; only waiting can.
                await waitFor(item).toBeVisible(visibilityThreshold).withTimeout(timeouts.TWO_SEC);
                return;
            } catch (error) {
                lastError = error;
            }

            if (attempt < maxScrolls - 1) {
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

        throw lastError;
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

        try {
            await this.scrollServerListIntoView();
        } catch {
            // Sheet already expanded, or the drag did not take; carry on and let
            // scrollServerItemIntoView decide.
        }

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
