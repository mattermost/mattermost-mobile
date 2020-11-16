// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelScreen} from '@support/ui/component';
import {MainSidebar} from '@support/ui/screen';

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
        await ChannelScreen.mainSidebarDrawerButton.tap();
        await MainSidebar.addChannel.tap();

        return this.toBeVisible();
    }
}

const moreChannelsScreen = new MoreChannelsScreen();
export default moreChannelsScreen;
