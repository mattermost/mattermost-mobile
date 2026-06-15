// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NotificationSettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class EmailNotificationSettingsScreen {
    testID = {
        emailNotificationSettingsScreen: 'email_notification_settings.screen',
        backButton: 'screen.back.button',
        scrollView: 'email_notification_settings.scroll_view',
        immediatelyOption: 'email_notification_settings.immediately.option',
        immediatelyOptionSelected: 'email_notification_settings.immediately.option.selected',
        everyFifteenMinutesOption: 'email_notification_settings.every_fifteen_minutes.option',
        everyFifteenMinutesOptionSelected: 'email_notification_settings.every_fifteen_minutes.option.selected',
        everyHourOption: 'email_notification_settings.every_hour.option',
        everyHourOptionSelected: 'email_notification_settings.every_hour.option.selected',
        neverOption: 'email_notification_settings.never.option',
        neverOptionSelected: 'email_notification_settings.never.option.selected',
        emailThreadsOptionToggledOff: 'email_notification_settings.email_threads.option.toggled.false.button',
        emailThreadsOptionToggledOn: 'email_notification_settings.email_threads.option.toggled.true.button',
    };

    emailNotificationSettingsScreen = element(by.id(this.testID.emailNotificationSettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    scrollView = element(by.id(this.testID.scrollView));
    immediatelyOption = element(by.id(this.testID.immediatelyOption));
    immediatelyOptionSelected = element(by.id(this.testID.immediatelyOptionSelected));
    everyFifteenMinutesOption = element(by.id(this.testID.everyFifteenMinutesOption));
    everyFifteenMinutesOptionSelected = element(by.id(this.testID.everyFifteenMinutesOptionSelected));
    everyHourOption = element(by.id(this.testID.everyHourOption));
    everyHourOptionSelected = element(by.id(this.testID.everyHourOptionSelected));
    neverOption = element(by.id(this.testID.neverOption));
    neverOptionSelected = element(by.id(this.testID.neverOptionSelected));
    emailThreadsOptionToggledOff = element(by.id(this.testID.emailThreadsOptionToggledOff));
    emailThreadsOptionToggledOn = element(by.id(this.testID.emailThreadsOptionToggledOn));

    toBeVisible = async () => {
        await waitFor(this.emailNotificationSettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.emailNotificationSettingsScreen;
    };

    open = async () => {
        // # Open email notification settings screen
        await NotificationSettingsScreen.emailNotificationsOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.emailNotificationSettingsScreen).not.toBeVisible();
    };

    toggleEmailThreadsOptionOn = async () => {
        await this.emailThreadsOptionToggledOff.tap();
        await expect(this.emailThreadsOptionToggledOn).toBeVisible();
    };

    toggleEmailThreadsOptionOff = async () => {
        await this.emailThreadsOptionToggledOn.tap();
        await expect(this.emailThreadsOptionToggledOff).toBeVisible();
    };
}

const emailNotificationSettingsScreen = new EmailNotificationSettingsScreen();
export default emailNotificationSettingsScreen;
