// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect} from 'detox';

import {GeneralSettingsScreen} from '@support/ui/screen';

class NotificationSettingsScreen {
    testID = {
        notificationSettingsScreen: 'notification_settings.screen',
        backButton: 'screen.back.button',
        emailAction: 'notification_settings.email.action',
        mentionsAndRepliesAction: 'notification_settings.mentions_replies.action',
        mobileAction: 'notification_settings.mobile.action',
    };

    notificationSettingsScreen = element(by.id(this.testID.notificationSettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    emailAction = element(by.id(this.testID.emailAction));
    mentionsAndRepliesAction = element(by.id(this.testID.mentionsAndRepliesAction));
    mobileAction = element(by.id(this.testID.mobileAction));

    toBeVisible = async () => {
        await expect(this.notificationSettingsScreen).toBeVisible();

        return this.notificationSettingsScreen;
    };

    open = async () => {
        // # Open notification settings screen
        await GeneralSettingsScreen.notificationsAction.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.notificationSettingsScreen).not.toBeVisible();
    };
}

const notificationSettingsScreen = new NotificationSettingsScreen();
export default notificationSettingsScreen;
