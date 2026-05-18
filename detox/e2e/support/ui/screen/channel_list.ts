// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    NavigationHeader,
    PlusMenu,
    TeamSidebar,
} from '@support/ui/component';
import {HomeScreen} from '@support/ui/screen';
import {tapNativeBackButton, timeouts, wait, waitForElementToExist} from '@support/utils';
import {waitFor} from 'detox';

// Every expo-router modal in app/routes/(modals)/ wraps `getModalHeaderOptions`
// with a close-button testID of the form `close.<screen-name>.button`.
// When a prior test fails partway through and leaves one of these modals open,
// the next test's `beforeEach: ChannelListScreen.toBeVisible()` would silently
// succeed (channel_list.screen still exists in the hierarchy, just behind the
// modal) and the test would then fail with "View is not hittable" on the
// post_input / tab_bar / sidebar element it tries to touch next.
//
// The list is enumerated explicitly (rather than a regex match) because:
//   1. Detox `by.id` doesn't accept regex on all platforms uniformly.
//   2. Tapping the wrong close button can disrupt a screen that legitimately
//      contains a "close.something.button" testID — only canonical modal-header
//      close buttons should be tapped during recovery.
// Source: grep -rn "getModalHeaderOptions(...,.*'close\\..*\\.button')" app/routes
const KNOWN_MODAL_CLOSE_BUTTON_IDS: readonly string[] = Object.freeze([
    'close.create_or_edit_channel.button',
    'close.channel_info.button',
    'close.channel_add_members.button',
    'close.channel_bookmark.button',
    'close.channel_files.button',
    'close.channel_configuration.button',
    'close.create_direct_message.button',
    'close.find_channels.button',
    'close.browse_channels.button',
    'close.edit_post.button',
    'close.edit_profile.button',
    'close.edit_server.button',
    'close.invite.button',
    'close.join_team.button',
    'close.reschedule_draft.button',
    'close.settings.button',
    'close.custom_status.button',
    'close.apps_form.button',
    'close.interactive_dialog.button',
] as const);

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

        // Before polling individual channels, ensure the sidebar has finished syncing
        // data from the server. On slow CI runners (macos-15, Fabric, detoxDisableSync),
        // login completes and the channel_list.screen container appears before categories
        // and channel items have rendered. The "channels" category header display_name is
        // always present once data has loaded — use it as a reliable ready-flag.
        try {
            const channelsHeader = this.getCategoryHeaderDisplayName('channels');
            const headerTimeout = Math.min(timeouts.TEN_SEC, timeout);
            await waitForElementToExist(channelsHeader, headerTimeout);
        } catch {
            // Category header still not visible — continue with the polling loop anyway
            // in case it appears during iteration (e.g. custom categories, DM-only server).
        }

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

        // Diagnostics on failure: which state ARE we actually in? This logging
        // is the only way to distinguish "channel record never reached the local
        // DB" (server-side propagation lag) from "channel record is in the DB
        // but the sidebar component never re-rendered" (app-side observable
        // race). Fires only on the failure path so adds no overhead in passing
        // runs. Note: Detox doesn't expose the view hierarchy text directly, so
        // we probe a handful of well-known testIDs to fingerprint the screen.
        const probes: Array<{name: string; el: Detox.NativeElement}> = [
            {name: 'channel_list.screen', el: this.channelListScreen},
            {name: 'channel_list_header.team_display_name', el: this.headerTeamDisplayName},
            {name: 'category_header.channels.display_name', el: this.getCategoryHeaderDisplayName('channels')},
            {name: 'category_header.favorites.display_name', el: this.getCategoryHeaderDisplayName('favorites')},
            {name: 'category_header.direct_messages.display_name', el: this.getCategoryHeaderDisplayName('direct_messages')},
            {name: 'load_channels_error Retry button', el: element(by.text('Retry'))},
        ];
        const probeResults: string[] = [];
        /* eslint-disable no-await-in-loop, no-console */
        for (const probe of probes) {
            try {
                await waitForElementToExist(probe.el, timeouts.HALF_SEC);
                probeResults.push(`${probe.name}=present`);
            } catch {
                probeResults.push(`${probe.name}=absent`);
            }
        }
        /* eslint-enable no-await-in-loop, no-console */
        // eslint-disable-next-line no-console
        console.warn(
            `[waitForSidebarPublicChannelDisplayNameVisible] FAIL channelName=${channelName} ` +
            `categoriesProbed=[${categories.join(',')}] state={${probeResults.join('; ')}}`,
        );

        throw new Error(`Sidebar channel display name not visible (channel="${channelName}")`);
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

    /**
     * Dismiss any expo-router modal that may be left open from a prior test's
     * partial failure. Each modal in app/routes/(modals)/ uses
     * `getModalHeaderOptions(..., 'close.<screen>.button')`, so a single
     * targeted tap on any present close button pops the topmost modal.
     *
     * Loops up to 5 times so we handle stacked-modal scenarios (e.g. user is
     * 3 levels deep — channel_info → channel_settings → configuration). Each
     * close button is given a tight 600 ms exists-probe so the overall recovery
     * stays under ~3 s when no modals are open (the common case).
     */
    private dismissAnyOpenModals = async (): Promise<void> => {
        /* eslint-disable no-await-in-loop -- sequential modal dismissals */
        for (let depth = 0; depth < 5; depth++) {
            let dismissedOne = false;
            for (const closeId of KNOWN_MODAL_CLOSE_BUTTON_IDS) {
                const btn = element(by.id(closeId));
                try {
                    await waitFor(btn).toExist().withTimeout(timeouts.HALF_SEC);
                    await btn.tap();
                    await wait(timeouts.ONE_SEC);
                    dismissedOne = true;
                    break;
                } catch {
                    // Not this modal — try the next id.
                }
            }
            if (!dismissedOne) {
                return;
            }
        }
        /* eslint-enable no-await-in-loop */
    };

    /**
     * Pop the navigation stack back toward the channel list. Used in recovery
     * when a prior test left the app pushed into a settings / thread / channel-
     * detail screen and no modal close button is present. The app uses two
     * different back-button mechanisms:
     *
     *   - Channel screen: custom `<NavigationHeader>` component with testID
     *     `navigation.header.back` (handled via `NavigationHeader.backButton`).
     *   - Settings / Thread / etc. (expo-router native stack screens): the
     *     platform's system back chevron, which has no testID — tapped via
     *     `tapNativeBackButton()` (`device.pressBack()` on Android,
     *     `by.label('Back')` on iOS).
     *
     * We try BOTH on each iteration so the recovery handles either kind of
     * pushed screen. Up to 3 levels deep, bounded at ~9 s worst case when
     * neither button is present.
     */
    private popBackUntilChannelList = async (): Promise<void> => {
        /* eslint-disable no-await-in-loop -- sequential back navigation */
        for (let i = 0; i < 3; i++) {
            try {
                await waitForElementToExist(this.channelListScreen, timeouts.ONE_SEC);
                return;
            } catch {
                // Not on channel list yet.
            }
            let popped = false;
            try {
                await waitFor(NavigationHeader.backButton).toExist().withTimeout(timeouts.TWO_SEC);
                await NavigationHeader.backButton.tap();
                await wait(timeouts.ONE_SEC);
                popped = true;
            } catch {
                // No custom NavigationHeader back — fall through to native back.
            }
            if (!popped) {
                try {
                    await tapNativeBackButton(timeouts.TWO_SEC);
                    await wait(timeouts.ONE_SEC);
                    popped = true;
                } catch {
                    // Neither back button available — bail.
                }
            }
            if (!popped) {
                return;
            }
        }
        /* eslint-enable no-await-in-loop */
    };

    /**
     * After login, the app sometimes renders a "Couldn't load <server>" /
     * "Couldn't load <team>" / "Couldn't load categories for <server>" error
     * screen with a Retry button (see app/components/loading_error/index.tsx)
     * instead of the populated sidebar. This screen still renders the
     * `channel_list.screen` container, so `waitForElementToExist` succeeds and
     * subsequent assertions against `channel_list_header.team_display_name` or
     * `channel_list.threads.button` fail with a misleading "no elements
     * found" — the elements are gone because the load aborted, not because
     * the testID is wrong.
     *
     * Detection: probe `by.text('Retry')` — the LoadingError component has no
     * testID, but the button text is stable and uniquely identifies the error
     * state (the loaded sidebar has no Retry button). Tap it up to 3 times,
     * waiting between each, to give the team/channel data a chance to load.
     *
     * Bounded to ~6 s in the no-error case (single 1 s probe + early return)
     * so passing tests pay near-zero overhead.
     */
    private dismissAnyLoadError = async (): Promise<void> => {
        const retryButton = element(by.text('Retry'));
        /* eslint-disable no-await-in-loop -- sequential retry probes */
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await waitFor(retryButton).toExist().withTimeout(timeouts.ONE_SEC);
            } catch {
                // No Retry button — sidebar loaded successfully (or no error
                // ever appeared). Done.
                return;
            }
            // eslint-disable-next-line no-console
            console.warn(`[ChannelListScreen.dismissAnyLoadError] "Retry" present — tapping (attempt ${attempt + 1}/3)`);
            try {
                await retryButton.tap();
            } catch {
                // Tap failed (probably mid-animation) — wait and try the loop again.
            }

            // Give the retry-triggered fetch time to complete before we decide
            // whether to loop again.
            await wait(timeouts.FOUR_SEC);
        }
        /* eslint-enable no-await-in-loop */
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

        // ─── Active recovery preflight ───────────────────────────────────────
        // The channel_list.screen view is rendered on app startup and stays
        // mounted underneath every pushed/modal screen. So plain
        // `waitForElementToExist(this.channelListScreen)` succeeds even when a
        // modal is sitting on top — the next call to interact with the channel
        // list then fails with "View is not hittable" because the modal
        // intercepts touches. Empirical analysis of CI run 25947506060 found
        // ~45 of 74 iOS "not hittable" failures and ~50 Android sidebar-missing
        // failures were exactly this state-contamination pattern.
        //
        // Preflight strategy:
        //   1. Dismiss any known expo-router modal still open from a prior
        //      test's partial failure (looks for close.*.button by testID).
        //   2. Pop the native expo-router stack back if a settings/thread/etc
        //      screen is on top (uses the platform native back chevron).
        // Both steps are bounded (~3 s when nothing is open) so passing tests
        // pay near-zero overhead. Errors are swallowed — recovery is
        // best-effort; the subsequent waitForElementToExist is the real gate.
        try {
            await this.dismissAnyOpenModals();
            await this.popBackUntilChannelList();
        } catch {
            // Recovery is best-effort. Always fall through to the assertion.
        }
        try {
            // Use polling waitForElementToExist instead of waitFor().toExist() — on iOS 26.x
            // simulators the main run loop keeps 2 persistent work items pending, which stalls
            // Detox's app-idle synchronisation and makes waitFor().toExist() time out even when
            // the screen is rendered.
            await waitForElementToExist(this.channelListScreen, timeout);

            // The channel_list.screen container exists even when the load-error UI
            // is rendered on top (LoadTeamsError / LoadChannelsError / categories
            // error). Detect that state and tap Retry so the sidebar actually
            // populates before the caller asserts against testIDs inside it.
            await this.dismissAnyLoadError();
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
