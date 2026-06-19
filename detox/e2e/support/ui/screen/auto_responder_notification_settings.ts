// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NotificationSettingsScreen} from '@support/ui/screen';
import {isIos, tapNativeBackButton, timeouts} from '@support/utils';
import {expect} from 'detox';

class AutoResponderNotificationSettingsScreen {
    testID = {
        autoResponderNotificationSettingsScreen: 'auto_responder_notification_settings.screen',
        backButton: 'navigation.header.back',
        scrollView: 'auto_responder_notification_settings.scroll_view',
        enableAutomaticRepliesOptionToggledOff: 'auto_responder_notification_settings.enable_automatic_replies.option.toggled.false.button',
        enableAutomaticRepliesOptionToggledOn: 'auto_responder_notification_settings.enable_automatic_replies.option.toggled.true.button',
        messageInput: 'auto_responder_notification_settings.message.input',
        messageInputDescription: 'auto_responder_notification_settings.message.input.description',
    };

    autoResponderNotificationSettingsScreen = element(by.id(this.testID.autoResponderNotificationSettingsScreen));

    // Native-stack back chevron via accessibility label.
    get backButton(): Detox.NativeElement {
        return isIos()
            ? element(by.label('Back')).atIndex(0)
            : element(by.label('Navigate up')).atIndex(0);
    }

    scrollView = element(by.id(this.testID.scrollView));
    enableAutomaticRepliesOptionToggledOff = element(by.id(this.testID.enableAutomaticRepliesOptionToggledOff));
    enableAutomaticRepliesOptionToggledOn = element(by.id(this.testID.enableAutomaticRepliesOptionToggledOn));
    messageInput = element(by.id(this.testID.messageInput));
    messageInputDescription = element(by.id(this.testID.messageInputDescription));

    toBeVisible = async () => {
        await waitFor(this.autoResponderNotificationSettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.autoResponderNotificationSettingsScreen;
    };

    open = async () => {
        // # Open auto-responder notification settings screen
        await NotificationSettingsScreen.automaticRepliesOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        // Native-stack back chevron.
        await tapNativeBackButton();
        await waitFor(this.autoResponderNotificationSettingsScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    toggleEnableAutomaticRepliesOptionOn = async () => {
        await this.enableAutomaticRepliesOptionToggledOff.tap();
        await expect(this.enableAutomaticRepliesOptionToggledOn).toBeVisible();
    };

    toggleEnableAutomaticRepliesOptionOff = async () => {
        await this.enableAutomaticRepliesOptionToggledOn.tap();
        await expect(this.enableAutomaticRepliesOptionToggledOff).toBeVisible();
    };
}

const autoResponderNotificationSettingsScreen = new AutoResponderNotificationSettingsScreen();
export default autoResponderNotificationSettingsScreen;
