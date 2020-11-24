// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MainSidebar} from '@support/ui/component';

class MoreChannelsScreen {
    testID = {
        moreChannelsScreen: 'more_channels.screen',
        publicChannelCreateButton: 'public_channel.create.button',
    }

    moreChannelsScreen = element(by.id(this.testID.moreChannelsScreen));
    publicChannelCreateButton = element(by.id(this.testID.publicChannelCreateButton));

    toBeVisible = async () => {
        await expect(this.moreChannelsScreen).toBeVisible();

        return this.moreChannelsScreen;
    }

    open = async () => {
        // # Open more channels screen
        await MainSidebar.openMoreChannelsButton.tap();

        return this.toBeVisible();
    }
}

const moreChannelsScreen = new MoreChannelsScreen();
export default moreChannelsScreen;
