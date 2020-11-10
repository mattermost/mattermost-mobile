// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';

class ChannelInfoScreen {
    testID = {
        channelInfoScreen: 'channel_info.screen',
        closeChannelInfoButton: 'close.channel_info.button',
        channelIconGMMemberCount: 'channel_icon.gm_member_count',
        notificationPreferenceAction: 'channel_info.notification_preference.action',
        editChannelAction: 'channel_info.edit_channel.action',
    }

    channelInfoScreen = element(by.id(this.testID.channelInfoScreen));
    closeChannelInfoButton = element(by.id(this.testID.closeChannelInfoButton));
    channelIconGMMemberCount = element(by.id(this.testID.channelIconGMMemberCount));
    notificationPreferenceAction = element(by.id(this.testID.notificationPreferenceAction));
    editChannelAction = element(by.id(this.testID.editChannelAction));

    toBeVisible = async () => {
        await wait(timeouts.TWO_SEC);
        await expect(this.channelInfoScreen).toBeVisible();

        return this.channelInfoScreen;
    }

    open = async () => {
        // # Open channel info screen
        await ChannelScreen.channelTitleButton.tap();

        return this.toBeVisible();
    }

    close = async () => {
        await wait(timeouts.TWO_SEC);
        await this.closeChannelInfoButton.tap();
        await expect(this.channelInfoScreen).not.toBeVisible();
    }
}

const channelInfoScreen = new ChannelInfoScreen();
export default channelInfoScreen;
