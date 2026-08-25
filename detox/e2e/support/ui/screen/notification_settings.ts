// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {isIos, tapNativeBackButton, timeouts} from '@support/utils';

class NotificationSettingsScreen {
    testID = {
        notificationSettingsScreen: 'notification_settings.screen',
        backButton: 'navigation.header.back',
        scrollView: 'notification_settings.scroll_view',
        mentionsOption: 'notification_settings.mentions.option',
        pushNotificationsOption: 'notification_settings.push_notifications.option',
        emailNotificationsOption: 'notification_settings.email_notifications.option',
        emailNotificationsOptionInfo: 'notification_settings.email_notifications.option.info',
        automaticRepliesOption: 'notification_settings.automatic_replies.option',
        automaticRepliesOptionInfo: 'notification_settings.automatic_replies.option.info',
    };

    notificationSettingsScreen = element(by.id(this.testID.notificationSettingsScreen));

    // Native-stack back chevron via accessibility label.
    get backButton(): Detox.NativeElement {
        return isIos()
            ? element(by.label('Back')).atIndex(0)
            : element(by.label('Navigate up')).atIndex(0);
    }

    scrollView = element(by.id(this.testID.scrollView));
    mentionsOption = element(by.id(this.testID.mentionsOption));
    pushNotificationsOption = element(by.id(this.testID.pushNotificationsOption));
    emailNotificationsOption = element(by.id(this.testID.emailNotificationsOption));
    emailNotificationsOptionInfo = element(by.id(this.testID.emailNotificationsOptionInfo));
    automaticRepliesOption = element(by.id(this.testID.automaticRepliesOption));
    automaticRepliesOptionInfo = element(by.id(this.testID.automaticRepliesOptionInfo));

    toBeVisible = async () => {
        await waitFor(this.notificationSettingsScreen).toExist().withTimeout(timeouts.HALF_MIN);

        return this.notificationSettingsScreen;
    };

    open = async () => {
        // # Open notification settings screen
        await SettingsScreen.notificationsOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        // Native-stack back chevron.
        await tapNativeBackButton();
        await waitFor(this.notificationSettingsScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const notificationSettingsScreen = new NotificationSettingsScreen();
export default notificationSettingsScreen;
