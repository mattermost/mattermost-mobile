// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NotificationSettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class PushNotificationSettingsScreen {
    testID = {
        pushNotificationSettingsScreen: 'push_notification_settings.screen',
        backButton: 'screen.back.button',
        scrollView: 'push_notification_settings.scroll_view',
        allNewMessagesOption: 'push_notification_settings.all_new_messages.option',
        allNewMessagesOptionSelected: 'push_notification_settings.all_new_messages.option.selected',
        mentionsOnlyOption: 'push_notification_settings.mentions_only.option',
        mentionsOnlyOptionSelected: 'push_notification_settings.mentions_only.option.selected',
        nothingOption: 'push_notification_settings.nothing.option',
        nothingOptionSelected: 'push_notification_settings.nothing.option.selected',
        pushThreadsFollowingOptionToggledOff: 'push_notification_settings.push_threads_following.option.toggled.false.button',
        pushThreadsFollowingOptionToggledOn: 'push_notification_settings.push_threads_following.option.toggled.true.button',
        mobileOnlineOption: 'push_notification_settings.mobile_online.option',
        mobileOnlineOptionSelected: 'push_notification_settings.mobile_online.option.selected',
        mobileAwayOption: 'push_notification_settings.mobile_away.option',
        mobileAwayOptionSelected: 'push_notification_settings.mobile_away.option.selected',
        mobileOfflineOption: 'push_notification_settings.mobile_offline.option',
        mobileOfflineOptionSelected: 'push_notification_settings.mobile_offline.option.selected',
    };

    pushNotificationSettingsScreen = element(by.id(this.testID.pushNotificationSettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    scrollView = element(by.id(this.testID.scrollView));
    allNewMessagesOption = element(by.id(this.testID.allNewMessagesOption));
    allNewMessagesOptionSelected = element(by.id(this.testID.allNewMessagesOptionSelected));
    mentionsOnlyOption = element(by.id(this.testID.mentionsOnlyOption));
    mentionsOnlyOptionSelected = element(by.id(this.testID.mentionsOnlyOptionSelected));
    nothingOption = element(by.id(this.testID.nothingOption));
    nothingOptionSelected = element(by.id(this.testID.nothingOptionSelected));
    pushThreadsFollowingOptionToggledOff = element(by.id(this.testID.pushThreadsFollowingOptionToggledOff));
    pushThreadsFollowingOptionToggledOn = element(by.id(this.testID.pushThreadsFollowingOptionToggledOn));
    mobileOnlineOption = element(by.id(this.testID.mobileOnlineOption));
    mobileOnlineOptionSelected = element(by.id(this.testID.mobileOnlineOptionSelected));
    mobileAwayOption = element(by.id(this.testID.mobileAwayOption));
    mobileAwayOptionSelected = element(by.id(this.testID.mobileAwayOptionSelected));
    mobileOfflineOption = element(by.id(this.testID.mobileOfflineOption));
    mobileOfflineOptionSelected = element(by.id(this.testID.mobileOfflineOptionSelected));

    toBeVisible = async () => {
        await waitFor(this.pushNotificationSettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.pushNotificationSettingsScreen;
    };

    open = async () => {
        // # Open push notification settings screen
        await NotificationSettingsScreen.pushNotificationsOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.pushNotificationSettingsScreen).not.toBeVisible();
    };

    togglePushThreadsFollowingOptionOn = async () => {
        await this.pushThreadsFollowingOptionToggledOff.tap();
        await expect(this.pushThreadsFollowingOptionToggledOn).toBeVisible();
    };

    togglePushThreadsFollowingOptionOff = async () => {
        await this.pushThreadsFollowingOptionToggledOn.tap();
        await expect(this.pushThreadsFollowingOptionToggledOff).toBeVisible();
    };
}

const pushNotificationSettingsScreen = new PushNotificationSettingsScreen();
export default pushNotificationSettingsScreen;
