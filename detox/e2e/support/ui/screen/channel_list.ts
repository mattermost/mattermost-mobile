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
        channelListScreen: 'channel_list.screen',
        serverIcon: 'channel_list.servers.server_icon',
        headerTeamDisplayName: 'channel_list_header.team_display_name',
        headerServerDisplayName: 'channel_list_header.server_display_name',
        headerChevronButton: 'channel_list_header.chevron.button',
        headerPlusButton: 'channel_list_header.plus.button',
        findChannelsInput: 'channel_list.search_field.find_channels.input',
        threadsButton: 'channel_list.threads.button',
    };

    channelListScreen = element(by.id(this.testID.channelListScreen));
    serverIcon = element(by.id(this.testID.serverIcon));
    headerTeamDisplayName = element(by.id(this.testID.headerTeamDisplayName));
    headerServerDisplayName = element(by.id(this.testID.headerServerDisplayName));
    headerChevronButton = element(by.id(this.testID.headerChevronButton));
    headerPlusButton = element(by.id(this.testID.headerPlusButton));
    findChannelsInput = element(by.id(this.testID.findChannelsInput));
    threadsButton = element(by.id(this.testID.threadsButton));

    // convenience props
    teamFlatList = TeamSidebar.teamFlatList;
    browseChannelsItem = PlusMenu.browseChannelsItem;
    createNewChannelItem = PlusMenu.createNewChannelItem;
    openDirectMessageItem = PlusMenu.openDirectMessageItem;

    getCategoryCollapsed = (categoryKey: string) => {
        return element(by.id(`category_header.${categoryKey}.collapsed.true`));
    };

    getCategoryExpanded = (categoryKey: string) => {
        return element(by.id(`category_header.${categoryKey}.collapsed.false`));
    };

    getCategoryHeaderDisplayName = (categoryKey: string) => {
        return element(by.id(`category_header.${categoryKey}.display_name`));
    };

    getChannelListItemCollapsed = (categoryKey: string, channelName: string) => {
        return element(by.id(`category.${categoryKey}.channel_list_item.${channelName}.collapsed.true`));
    };

    getChannelListItemExpanded = (categoryKey: string, channelName: string) => {
        return element(by.id(`category.${categoryKey}.channel_list_item.${channelName}.collapsed.false`));
    };

    getChannelListItemDisplayName = (categoryKey: string, channelName: string) => {
        return element(by.id(`category.${categoryKey}.channel_list_item.${channelName}.display_name`));
    };

    getTeamItemSelected = (teamId: string) => {
        return element(by.id(`team_sidebar.team_list.team_item.${teamId}.selected`));
    };

    getTeamItemNotSelected = (teamId: string) => {
        return element(by.id(`team_sidebar.team_list.team_item.${teamId}.not_selected`));
    };

    getTeamItemDisplayNameAbbreviation = (teamId: string) => {
        return element(by.id(`team_sidebar.team_list.team_item.${teamId}.team_icon.display_name_abbreviation`));
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
}

const channelListScreen = new ChannelListScreen();
export default channelListScreen;
