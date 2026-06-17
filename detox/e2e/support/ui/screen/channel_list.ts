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

    ensureCategoryExpanded = async (categoryKey: string) => {
        try {
            await waitForElementToExist(this.getCategoryCollapsed(categoryKey), timeouts.TWO_SEC);
            await this.getCategoryCollapsed(categoryKey).tap();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Category already expanded or header not yet rendered
        }
    };

    waitForSidebarPublicChannelDisplayNameVisible = async (channelName: string, timeout = timeouts.ONE_MIN) => {
        const deadline = Date.now() + timeout;
        const categories = ['channels', 'unreads', 'favorites'] as const;

        await this.ensureCategoryExpanded('channels');

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

        const probes: Array<{name: string; el: Detox.NativeElement}> = [
            {name: 'channel_list.screen', el: this.channelListScreen},
            {name: 'channel_list_header.team_display_name', el: this.headerTeamDisplayName},
            {name: 'category_header.channels.display_name', el: this.getCategoryHeaderDisplayName('channels')},
            {name: 'category_header.favorites.display_name', el: this.getCategoryHeaderDisplayName('favorites')},
            {name: 'category_header.direct_messages.display_name', el: this.getCategoryHeaderDisplayName('direct_messages')},
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

    toBeVisible = async (timeout = timeouts.HALF_MIN) => {

        try {
            await this.dismissAnyOpenModals();
            await this.popBackUntilChannelList();
        } catch {
            // Recovery is best-effort. Always fall through to the assertion.
        }
        try {
            await waitForElementToExist(this.channelListScreen, timeout);
        } catch (firstError) {
            // eslint-disable-next-line no-console
            console.warn('[ChannelListScreen.toBeVisible] Channel list not found — attempting recovery relaunch');
            try {
                await device.launchApp({newInstance: true, launchArgs: {detoxEnableSynchronization: 0}});

                try {
                    const savePasswordAlert = element(by.label('Save Password')).atIndex(0);
                    await waitFor(savePasswordAlert).toExist().withTimeout(timeouts.TWO_SEC);
                    await element(by.label('Not Now')).atIndex(0).tap();
                    await wait(timeouts.ONE_SEC);
                } catch {
                    // Alert not present, proceed normally
                }

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
