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
        const visibilityThreshold = 75;
        let lastError: unknown;
        try {
            await this.serverList.scrollTo('top');
        } catch {
            // The list may already be at its boundary.
        }

        // Settle at the top before scrolling anywhere. The sheet animates in and the rows
        // re-render after a server switch, so the first check has to outlast the presentation.
        // It previously got TWO_SEC like every other attempt, expired inside the animation,
        // and the loop then scrolled DOWN — walking a row that was already at the top up
        // under the sheet's header, where it could never reach the threshold again no matter
        // how many attempts were left. MM-T4675_2's failure screenshot is exactly that end
        // state: "Server 1" clipped by the sheet header after the full run of scrolls.
        try {
            await waitFor(item).toBeVisible(visibilityThreshold).withTimeout(timeouts.TEN_SEC);
            return;
        } catch (error) {
            lastError = error;
        }

        /* eslint-disable no-await-in-loop -- bounded scan of the server FlatList */
        for (let attempt = 0; attempt < maxScrolls; attempt++) {
            try {
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

            try {
                // Re-check before touching the row. A swipe from an earlier attempt persists,
                // and an already-open row is translated out from under the sheet's left edge
                // with the Edit/Remove/Log out panel in its place — so it can never satisfy
                // scrollServerItemIntoView's visibility gate. Running that gate first (and,
                // worse, outside this try, where its failure skipped the open() recovery
                // below) is what burned MM-T4691_5/_6/_7: the row was swiped open and on
                // screen the whole time, exactly as their failure screenshots show.
                if (await this.isOptionHittable(revealed)) {
                    return revealed;
                }

                const target = await this.getServerItem(serverDisplayName);
                await this.scrollServerItemIntoView(target);
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
