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

    // expo-router native stack screen — the custom NavigationHeader's
    // 'navigation.header.back' testID is not rendered here. The chevron is
    // owned by @react-navigation/native-stack: iOS surfaces it via
    // `accessibilityLabel="Back"`, Android via the Toolbar's default
    // navigation-icon contentDescription "Navigate up".
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
        // Use platform-native back chevron: Android via device.pressBack(),
        // iOS via by.label('Back'). The custom NavigationHeader's testID
        // does not exist on this screen (expo-router native stack).
        await tapNativeBackButton();
        await waitFor(this.notificationSettingsScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const notificationSettingsScreen = new NotificationSettingsScreen();
export default notificationSettingsScreen;
