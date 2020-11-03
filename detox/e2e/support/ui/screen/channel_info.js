// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelScreen} from '@support/ui/screen';

class ChannelInfoScreen {
    testID = {
        channelInfoScreen: 'channel_info.screen',
        channelInfoClose: 'screen.channel_info.close',
        channelIconGMMemberCount: 'channel_icon.gm_member_count',
    }

    channelInfoScreen = element(by.id(this.testID.channelInfoScreen));
    channelInfoClose = element(by.id(this.testID.channelInfoClose));
    channelIconGMMemberCount = element(by.id(this.testID.channelIconGMMemberCount));

    toBeVisible = async () => {
        const screen = await this.channelInfoScreen;
        await expect(screen).toBeVisible();

        return screen;
    }

    open = async () => {
        // # Open channel info
        await ChannelScreen.channelTitleButton.tap();

        return this.toBeVisible();
    }

    close = async () => {
        await this.channelInfoClose.tap();
        await expect(this.channelInfoScreen).not.toBeVisible();
    }
}

const channelInfoScreen = new ChannelInfoScreen();
export default channelInfoScreen;
