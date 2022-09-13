// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SearchBar} from '@support/ui/component';
import {ChannelListScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class FindChannelsScreen {
    testID = {
        findChannelsScreenPrefix: 'find_channels.',
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

    getFilteredChannelItem = (channelName: string) => {
        return element(by.id(`${this.testID.filteredChannelItemPrefix}${channelName}`));
    };

    getFilteredChannelItemDisplayName = (channelName: string) => {
        return element(by.id(`${this.testID.filteredChannelItemPrefix}${channelName}.display_name`));
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
