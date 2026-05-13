// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    NavigationHeader,
    PlusMenu,
    TeamSidebar,
} from '@support/ui/component';
import {HomeScreen} from '@support/ui/screen';
import {timeouts, wait, waitForElementToExist} from '@support/utils';
import {waitFor} from 'detox';

class ChannelListScreen {
    testID = {
        categoryHeaderPrefix: 'channel_list.category_header.',
        categoryPrefix: 'channel_list.category.',
        draftChannelInfo: 'draft_post.channel_info',
        draftbuttonListScreen: 'channel_list.drafts.button',
        draftCountListScreen: 'channel_list.drafts.count',
        scheduledMessageCountListScreen: 'channel_list.scheduled_post.count',
        teamItemPrefix: 'team_sidebar.team_list.team_item.',
        channelListScreen: 'channel_list.screen',
        serverIcon: 'channel_list.servers.server_icon',
        headerTeamDisplayName: 'channel_list_header.team_display_name',
        headerServerDisplayName: 'channel_list_header.server_display_name',
        headerPlusButton: 'channel_list_header.plus.button',
        subheaderSearchFieldButton: 'channel_list_subheader.search_field.button',
        findChannelsInput: 'channel_list.search_field.find_channels.input',
        threadsButton: 'channel_list.threads.button',
    };

    channelListScreen = element(by.id(this.testID.channelListScreen));
    serverIcon = element(by.id(this.testID.serverIcon));
    headerTeamDisplayName = element(by.id(this.testID.headerTeamDisplayName));
    headerServerDisplayName = element(by.id(this.testID.headerServerDisplayName));
    headerPlusButton = element(by.id(this.testID.headerPlusButton));
    subheaderSearchFieldButton = element(by.id(this.testID.subheaderSearchFieldButton));
    findChannelsInput = element(by.id(this.testID.findChannelsInput));
    threadsButton = element(by.id(this.testID.threadsButton));

    // convenience props
    teamFlatList = TeamSidebar.teamFlatList;
    browseChannelsItem = PlusMenu.browseChannelsItem;
    createNewChannelItem = PlusMenu.createNewChannelItem;
    openDirectMessageItem = PlusMenu.openDirectMessageItem;
    invitePeopleToTeamItem = PlusMenu.invitePeopleToTeamItem;

    getCategoryCollapsed = (categoryKey: string) => {
        return element(by.id(`${this.testID.categoryHeaderPrefix}${categoryKey}.collapsed.true`));
    };

    getCategoryExpanded = (categoryKey: string) => {
        return element(by.id(`${this.testID.categoryHeaderPrefix}${categoryKey}.collapsed.false`));
    };

    getCategoryHeaderDisplayName = (categoryKey: string) => {
        return element(by.id(`${this.testID.categoryHeaderPrefix}${categoryKey}.display_name`));
    };

    getChannelItem = (categoryKey: string, channelName: string) => {
        return element(by.id(`${this.testID.categoryPrefix}${categoryKey}.channel_item.${channelName}`));
    };

    getChannelItemDisplayName = (categoryKey: string, channelName: string) => {
        return element(by.id(`${this.testID.categoryPrefix}${categoryKey}.channel_item.${channelName}.display_name`));
    };

    /**
     * Public channel rows can appear under Unreads (when grouped unreads is on), Channels, or
     * Favorites. Poll all three categories in a rolling cycle until the deadline is reached.
     *
     * Strategy: probe each category for up to 3 s per attempt, cycling through channels →
     * unreads → favorites until the total timeout is exhausted. This avoids both bridge-idle
     * synchronisation (which can stall indefinitely on iOS 26.x) and the split-budget problem
     * where a channel appearing in 'unreads' after 16 s would miss the 15 s channels window.
     *
     * If the "Couldn't load {teamName}" error screen appears, taps Retry and keeps polling.
     */
    waitForSidebarPublicChannelDisplayNameVisible = async (channelName: string, timeout = timeouts.ONE_MIN) => {
        const deadline = Date.now() + timeout;
        const categories = ['channels', 'unreads', 'favorites'] as const;

        /* eslint-disable no-await-in-loop */
        while (Date.now() < deadline) {
            // Check if the "Couldn't load" error screen has appeared due to WebSocket
            // connection failure. Detect it via the unique 'Retry' button (the error title
            // contains a dynamic team name so by.text() exact-match won't work). Tap Retry
            // and continue polling to give the reload time to finish.
            try {
                const retryButton = element(by.text('Retry'));
                await waitForElementToExist(retryButton, timeouts.TWO_SEC);
                await retryButton.tap();
                await wait(timeouts.FOUR_SEC);
                continue;
            } catch {
                // No error screen, proceed with normal polling
            }

            for (const cat of categories) {
                const remaining = deadline - Date.now();
                if (remaining <= 0) {
                    break;
                }
                try {
                    // Use polling waitForElementToExist — bypasses bridge-idle sync so
                    // the timer always counts real wall-clock time on iOS 26.x and Android.
                    await waitForElementToExist(
                        this.getChannelItemDisplayName(cat, channelName),
                        Math.min(timeouts.THREE_SEC, remaining),
                    );
                    return;
                } catch {
                    // Not in this category yet — try the next
                }
            }
        }
        /* eslint-enable no-await-in-loop */
        throw new Error('Sidebar channel display name not visible');
    };

    tapSidebarPublicChannelDisplayName = async (channelName: string, timeout = timeouts.ONE_MIN) => {
        await this.waitForSidebarPublicChannelDisplayNameVisible(channelName, timeout);
        const categories = ['channels', 'unreads', 'favorites'] as const;

        /* eslint-disable no-await-in-loop -- sequential fallback: each probe must complete */
        for (const cat of categories) {
            // Prefer tapping the channel_item container (full row): the display_name text
            // is clipped by the narrow iPad sidebar column and fails Detox's 100% visibility
            // check even though the row itself is hittable.
            const container = this.getChannelItem(cat, channelName);
            const label = this.getChannelItemDisplayName(cat, channelName);
            try {
                await waitForElementToExist(container, timeouts.TWO_SEC);
                await container.tap();
                return;
            } catch {
                // Container not hittable — try the label as a fallback
            }
            try {
                await waitForElementToExist(label, timeouts.TWO_SEC);
                await label.tap();
                return;
            } catch {
                // Try next category
            }
        }
        /* eslint-enable no-await-in-loop */
        // All categories failed — include the searched categories in the error for easier CI debugging
        throw new Error(`Sidebar channel item not found for channel: ${channelName}; searched categories: [${categories.join(', ')}]`);
    };

    getTeamItemSelected = (teamId: string) => {
        return element(by.id(`${this.testID.teamItemPrefix}${teamId}.selected`));
    };

    getTeamItemNotSelected = (teamId: string) => {
        return element(by.id(`${this.testID.teamItemPrefix}${teamId}.not_selected`));
    };

    getTeamItemDisplayNameAbbreviation = (teamId: string) => {
        return element(by.id(`${this.testID.teamItemPrefix}${teamId}.team_icon.display_name_abbreviation`));
    };

    toBeVisible = async (timeout = timeouts.HALF_MIN) => {
        // iOS 26.x on macos-15 CI runners takes longer than 10s to settle the channel
        // list screen after login navigation (React Native bridge + Metro warm-up).
        // Android CI emulators are also slow — use HALF_MIN for both so we never race.
        // Use toExist() (not toBeVisible()) because Android edge-to-edge rendering
        // can cause the channel list screen to exist but not meet the 50% visibility
        // threshold, which cascades into every subsequent test in the suite.
        // Callers that need a longer wait (e.g. post-archive navigation on API 35)
        // can pass an explicit timeout.
        try {
            // Use polling waitForElementToExist instead of waitFor().toExist() — on iOS 26.x
            // simulators the main run loop keeps 2 persistent work items pending, which stalls
            // Detox's app-idle synchronisation and makes waitFor().toExist() time out even when
            // the screen is rendered.
            await waitForElementToExist(this.channelListScreen, timeout);
        } catch (firstError) {
            // A previous test may have left the app mid-navigation (e.g. DM screen open,
            // bottom sheet animating). Recovery: relaunch the app with a new instance so
            // the server screen appears, then wait for the server screen to hand off to
            // the channel list. This prevents a single mid-navigation failure from
            // cascading into every remaining test in the suite.
            // eslint-disable-next-line no-console
            console.warn('[ChannelListScreen.toBeVisible] Channel list not found — attempting recovery relaunch');
            try {
                // Pass detoxDisableSynchronization so the launch is not blocked by a
                // stuck BridgeIdlingResource — a common Android CI pattern where a
                // previous test left the bridge busy (network request, animation) and
                // Detox's idle wait never resolves, causing all subsequent waitFor calls
                // to timeout immediately until the app is restarted.
                await device.launchApp({newInstance: true, launchArgs: {detoxEnableSynchronization: 0}});

                // After relaunch, iOS may show a "Save Password" system alert that
                // blocks interaction with the channel list. Dismiss it if present.
                // The alert uses a label-based matcher (not testID) for iOS system alerts.
                try {
                    const savePasswordAlert = element(by.label('Save Password')).atIndex(0);
                    await waitFor(savePasswordAlert).toExist().withTimeout(timeouts.TWO_SEC);
                    await element(by.label('Not Now')).atIndex(0).tap();
                    await wait(timeouts.ONE_SEC);
                } catch {
                    // Alert not present, proceed normally
                }

                // If the back button is present we are inside a channel — tap it once to pop
                // back to the channel list. We attempt this up to 3 times to handle nested
                // navigation (e.g. thread → channel → channel list).
                /* eslint-disable no-await-in-loop -- sequential back-navigation: each tap must complete before probing again */
                for (let i = 0; i < 3; i++) {
                    try {
                        // Quick probe — don't wait long; if back button isn't there, we're done.
                        await waitFor(NavigationHeader.backButton).toExist().withTimeout(timeouts.FOUR_SEC);
                        await NavigationHeader.backButton.tap();
                        await wait(timeouts.ONE_SEC);
                    } catch {
                        // Back button not found — already at channel list (or login screen).
                        break;
                    }
                }
                /* eslint-enable no-await-in-loop */

                // Polling helper bypasses iOS 26 app-idle sync stall.
                await waitForElementToExist(this.channelListScreen, timeouts.TWO_MIN);
            } catch (recoveryError) {
                // Log recovery failure, then re-throw the original error so the test failure message is meaningful
                // eslint-disable-next-line no-console
                console.warn('[ChannelListScreen.toBeVisible] Recovery relaunch also failed:', recoveryError);
                throw firstError;
            }
        }

        return this.channelListScreen;
    };

    open = async () => {
        // # Open channel list screen
        await HomeScreen.channelListTab.tap();

        return this.toBeVisible();
    };

    draftsButton = {
        toBeVisible: async () => {
            await waitFor(element(by.id(this.testID.draftbuttonListScreen))).toBeVisible().withTimeout(timeouts.ONE_SEC);
        },
        toNotBeVisible: async () => {
            await waitFor(element(by.id(this.testID.draftbuttonListScreen))).not.toBeVisible().withTimeout(timeouts.ONE_SEC);
        },
        tap: async () => {
            await element(by.id(this.testID.draftbuttonListScreen)).tap();
        },
    };

    getDraftChannelInfo = () => {
        return element(by.id(this.testID.draftChannelInfo));
    };
}

const channelListScreen = new ChannelListScreen();
export default channelListScreen;
