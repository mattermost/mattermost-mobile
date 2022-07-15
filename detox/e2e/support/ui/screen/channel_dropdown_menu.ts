// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BrowseChannelsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class ChannelDropdownMenuScreen {
    testID = {
        channelDropdownMenuScreen: 'browse_channels.dropdown_slideup.screen',
        publicChannelsItem: 'browse_channels.dropdown_slideup_item.public_channels',
        archivedChannelsItem: 'browse_channels.dropdown_slideup_item.archived_channels',
        sharedChannelsItem: 'browse_channels.dropdown_slideup_item.shared_channels',
    };

    channelDropdownMenuScreen = element(by.id(this.testID.channelDropdownMenuScreen));
    publicChannelsItem = element(by.id(this.testID.publicChannelsItem));
    archivedChannelsItem = element(by.id(this.testID.archivedChannelsItem));
    sharedChannelsItem = element(by.id(this.testID.sharedChannelsItem));

    toBeVisible = async () => {
        await waitFor(this.channelDropdownMenuScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.channelDropdownMenuScreen;
    };

    open = async () => {
        // # Open channel dropdown menu screen
        await BrowseChannelsScreen.channelDropdown.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.channelDropdownMenuScreen.tap({x: 5, y: 10});
        await expect(this.channelDropdownMenuScreen).not.toBeVisible();
    };
}

const channelDropdownMenuScreen = new ChannelDropdownMenuScreen();
export default channelDropdownMenuScreen;
