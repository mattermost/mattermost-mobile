// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

// Point inside the tutorial scrim, clear of both the tooltip card (vertically centred)
// and the highlighted server row's cut-out (in the bottom sheet). Element-relative, and
// the scrim spans the whole window.
const TUTORIAL_DISMISS_POINT = {x: 40, y: 140};

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

        // The pressable backdrop inside the tutorial Modal. tutorial_swipe_left cannot be
        // used as the dismiss target: its root View sets pointerEvents='none'
        // (components/tutorial_highlight/swipe_left.tsx), so a tap on it hit-tests into
        // this sibling SVG and Detox rejects it as "not hittable".
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
            // Existence is not presentation. The sheet's view stays in the hierarchy while
            // it is dismissed, so an existence-only wait let open() report success with the
            // app still on the channel list — and swipeRevealOption then swiped a row that
            // was nowhere on screen. Proven by testFnFailure.png for MM-T4691_4 in CI run
            // 32543957273: the screenshot at the moment of failure is the channel list, and
            // the edit option's frame was RNGH's closed translate (x = -10000 + row x).
            await waitForElementToExist(this.serverListScreen, timeouts.TEN_SEC);

            // The multi-server tutorial is a full-screen RN Modal whose backdrop SVG
            // paints a 30%-opacity wash over every pixel of the window. Detox on iOS
            // derives visibility from a pixel comparison, so while it is up
            // server_list.screen measures 0% visible and can never reach the 75%
            // threshold (MM-T4691_1..7 and MM-T4675_2 on f181296 — see the
            // DETOX_VISIBILITY_*.png pair in those shards, where the whole sheet is
            // washed grey). It is armed 500ms after the row lays out, which is after
            // the existence wait above returns, so dismiss between attempts rather
            // than once up front.
            /* eslint-disable no-await-in-loop -- retry visibility around a tutorial dismissal */
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await waitForElementToBeVisible(this.serverListScreen, timeouts.FOUR_SEC);
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

    // Dismiss the multi-server tutorial Modal if it is up. Returns whether it was
    // present AND dismissed, so callers can tell "there was nothing to do" apart from
    // "the blocker is still there" instead of swallowing the difference.
    dismissTutorialIfPresent = async (): Promise<boolean> => {
        try {
            await waitFor(this.tutorialHighlight).toExist().withTimeout(timeouts.TWO_SEC);
        } catch {
            // Not shown on this install, or already watched — storeMultiServerTutorial()
            // persists the flag on first dismissal.
            return false;
        }

        // The backdrop spans the whole window, so its centre point sits under the
        // "Swipe left on a server…" tooltip card. Detox hit-tests a tap at the view's
        // centre and rejects it when the target is not the visible thing there —
        // messageId 87 on iOS shard 19 of run 32881947481: "View is not hittable at its
        // visible point ... view point: {201, 437}". TUTORIAL_DISMISS_POINT is above the
        // card and above the highlighted row's cut-out, so the scrim itself is what gets
        // hit. The centre tap and the Modal host are kept as fallbacks for builds whose
        // overlay geometry differs (tablet, landscape).
        /* eslint-disable no-await-in-loop -- fall through to the next dismiss target */
        const attempts: Array<() => Promise<void>> = [
            () => this.tutorialBackdrop.tap(TUTORIAL_DISMISS_POINT),
            () => this.tutorialBackdrop.tap(),
            () => this.tutorialHighlight.tap(),
        ];
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
