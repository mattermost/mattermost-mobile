// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class NotificationSettingsScreen {
    testID = {
        notificationSettingsScreen: 'notification_settings.screen',
        backButton: 'screen.back.button',
        scrollView: 'notification_settings.scroll_view',
        mentionsOption: 'notification_settings.mentions.option',
        pushNotificationsOption: 'notification_settings.push_notifications.option',
        emailNotificationsOption: 'notification_settings.email_notifications.option',
        emailNotificationsOptionInfo: 'notification_settings.email_notifications.option.info',
        automaticRepliesOption: 'notification_settings.automatic_replies.option',
        automaticRepliesOptionInfo: 'notification_settings.automatic_replies.option.info',
    };

    notificationSettingsScreen = element(by.id(this.testID.notificationSettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    scrollView = element(by.id(this.testID.scrollView));
    mentionsOption = element(by.id(this.testID.mentionsOption));
    pushNotificationsOption = element(by.id(this.testID.pushNotificationsOption));
    emailNotificationsOption = element(by.id(this.testID.emailNotificationsOption));
    emailNotificationsOptionInfo = element(by.id(this.testID.emailNotificationsOptionInfo));
    automaticRepliesOption = element(by.id(this.testID.automaticRepliesOption));
    automaticRepliesOptionInfo = element(by.id(this.testID.automaticRepliesOptionInfo));

    toBeVisible = async () => {
        await waitFor(this.notificationSettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.notificationSettingsScreen;
    };

    open = async () => {
        // # Open notification settings screen
        await SettingsScreen.notificationsOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.notificationSettingsScreen).not.toBeVisible();
    };
}

const notificationSettingsScreen = new NotificationSettingsScreen();
export default notificationSettingsScreen;
