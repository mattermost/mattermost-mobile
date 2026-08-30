// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SearchBar} from '@support/ui/component';
import {ChannelListScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

class FindChannelsScreen {
    testID = {
        findChannelsScreenPrefix: 'find_channels.',
        filteredArchivedChannelItemPrefix: 'find_channels.filtered_list.remote_channel_item.',
        filteredChannelItemPrefix: 'find_channels.filtered_list.channel_item.',
        unfilteredChannelItemPrefix: 'find_channels.unfiltered_list.channel_item.',
        findChannelsScreen: 'find_channels.screen',
        closeButton: 'close.find_channels.button',
        directoryQuickOption: 'find_channels.quick_options.directory.option',
        openDirectMessageQuickOption: 'find_channels.quick_options.open_dm.option',
        newChannelQuickOption: 'find_channels.quick_options.new_channel.option',
        sectionUnfilteredChannelList: 'find_channels.unfiltered_list.section_list',
        flatFilteredChannelList: 'find_channels.filtered_list.flat_list',
    };

    findChannelsScreen = element(by.id(this.testID.findChannelsScreen));
    closeButton = element(by.id(this.testID.closeButton));
    directoryQuickOption = element(by.id(this.testID.directoryQuickOption));
    openDirectMessageQuickOption = element(by.id(this.testID.openDirectMessageQuickOption));
    newChannelQuickOption = element(by.id(this.testID.newChannelQuickOption));
    sectionUnfilteredChannelList = element(by.id(this.testID.sectionUnfilteredChannelList));
    flatFilteredChannelList = element(by.id(this.testID.flatFilteredChannelList));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.findChannelsScreenPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.findChannelsScreenPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.findChannelsScreenPrefix);
    clearButton = SearchBar.getClearButton(this.testID.findChannelsScreenPrefix);

    getUnfilteredChannelItem = (channelName: string) => {
        return element(by.id(`${this.testID.unfilteredChannelItemPrefix}${channelName}`));
    };

    getUnfilteredChannelItemDisplayName = (channelName: string) => {
        return element(by.id(`${this.testID.unfilteredChannelItemPrefix}${channelName}.display_name`));
    };

    getFilteredArchivedChannelItem = (channelName: string) => {
        return element(by.id(`${this.testID.filteredArchivedChannelItemPrefix}${channelName}`));
    };

    getFilteredChannelItem = (channelName: string) => {
        return element(by.id(`${this.testID.filteredChannelItemPrefix}${channelName}`));
    };

    getFilteredChannelItemDisplayName = (channelName: string) => {
        return element(by.id(`${this.testID.filteredChannelItemPrefix}${channelName}.display_name`));
    };

    getFilteredUserItem = (userId: string) => {
        return element(by.id(`${this.testID.findChannelsScreenPrefix}filtered_list.user_item.${userId}`));
    };

    getFilteredUserItemDisplayName = (userId: string) => {
        return element(by.id(`${this.testID.findChannelsScreenPrefix}filtered_list.user_item.${userId}.display_name`));
    };

    tapFilteredUserItem = async (userId: string) => {
        const label = this.getFilteredUserItemDisplayName(userId);
        await waitFor(label).toBeVisible(40).withTimeout(timeouts.HALF_MIN);
        await label.tap({x: 1, y: 1});
    };

    // Same idiom as tapFilteredUserItem, and for the same reason. A plain tap on the row
    // fails on iOS: Detox checks hittability at the view's centre point against a 100%
    // visibility threshold, and MM-T4907_4's group-message row failed it —
    //   "View is not hittable at its visible point ... does not pass visibility percent
    //    threshold (100)", view bounds {362, 40}, visible bounds {362, 40}
    // — i.e. the row was fully on screen and fully drawn. A corner tap on the row's label
    // clears the same check.
    tapFilteredChannelItem = async (channelName: string) => {
        const label = this.getFilteredChannelItemDisplayName(channelName);
        await waitFor(label).toBeVisible(40).withTimeout(timeouts.HALF_MIN);
        await label.tap({x: 1, y: 1});
    };

    toBeVisible = async () => {
        await waitFor(this.findChannelsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.findChannelsScreen;
    };

    open = async () => {
        // # Open find channels screen
        await ChannelListScreen.subheaderSearchFieldButton.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.findChannelsScreen).not.toBeVisible();
    };
}

const findChannelsScreen = new FindChannelsScreen();
export default findChannelsScreen;
