// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    PlusMenu,
    TeamSidebar,
} from '@support/ui/component';
import {HomeScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';

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

    getTeamItemSelected = (teamId: string) => {
        return element(by.id(`${this.testID.teamItemPrefix}${teamId}.selected`));
    };

    getTeamItemNotSelected = (teamId: string) => {
        return element(by.id(`${this.testID.teamItemPrefix}${teamId}.not_selected`));
    };

    getTeamItemDisplayNameAbbreviation = (teamId: string) => {
        return element(by.id(`${this.testID.teamItemPrefix}${teamId}.team_icon.display_name_abbreviation`));
    };

    toBeVisible = async () => {
        await waitFor(this.channelListScreen).toExist().withTimeout(timeouts.TEN_SEC);

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
