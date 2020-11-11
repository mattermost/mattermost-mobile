// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelInfoScreen} from '@support/ui/screen';

class ChannelNotificationPreferenceScreen {
    testID = {
        channelNotificationPreferenceScreen: 'channel_notification_preference.screen',
        backButton: 'screen.back.button',
    }

    channelNotificationPreferenceScreen = element(by.id(this.testID.channelNotificationPreferenceScreen));
    backButton = element(by.id(this.testID.backButton));

    titleText = 'Mobile Notifications';
    headerText = 'Send Notifications';
    optionDefaultText = 'Global default';
    optionAllText = 'For all activity';
    optionMentionsText = 'Only mentions and direct messages';
    optionNeverText = 'Never';

    toBeVisible = async () => {
        await expect(this.channelNotificationPreferenceScreen).toBeVisible();

        return this.channelNotificationPreferenceScreen;
    }

    open = async () => {
        // # Open channel notification preference screen
        await ChannelInfoScreen.notificationPreferenceAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.channelNotificationPreferenceScreen).not.toBeVisible();
    }
}

const channelNotificationPreferenceScreen = new ChannelNotificationPreferenceScreen();
export default channelNotificationPreferenceScreen;
