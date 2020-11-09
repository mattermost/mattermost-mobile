// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    MainSidebar,
    SettingsSidebar,
} from '@support/ui/component';
import {
    ChannelInfoScreen,
    ChannelNotificationPreferenceScreen,
    ChannelScreen,
    GeneralSettingsScreen,
    NotificationSettingsMobileScreen,
    NotificationSettingsScreen,
} from '@support/ui/screen';
import {Setup} from '@support/server_api';
import {isAndroid} from '@support/utils';

describe('Channel Notification Preference - Default', () => {
    let testChannel;

    beforeAll(async () => {
        const {user, channel} = await Setup.apiInit();
        testChannel = channel;
        await ChannelScreen.open(user);
    });

    beforeEach(async () => {
        // # Open channel drawer
        await ChannelScreen.mainSidebarDrawerButton.tap();
        await MainSidebar.toBeVisible();

        // # Go to channel
        await MainSidebar.getChannelByDisplayName(testChannel.display_name).tap();
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    afterEach(async () => {
        // # Close channel info screen
        await ChannelInfoScreen.close();
    });

    it('MM-T3376_1 should be able to select Global Default option and display Default next to Mobile Notifications', async () => {
        // # Set global notifications to mentions
        await setGlobalNotificationsTo('mentions');

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // # Tap on Mobile Notifications
        await ChannelInfoScreen.notificationPreferenceAction.tap();

        // # Tap on For all activity option
        await element(by.text(`${ChannelNotificationPreferenceScreen.optionDefaultText} (Mentions)`)).tap();

        // # Tap on back button
        ChannelNotificationPreferenceScreen.back();

        // * Verify notification level Default abbreviation
        await ChannelInfoScreen.toBeVisible();
        await expect(element(by.id(ChannelInfoScreen.testID.notificationPreferenceAction).withDescendant(by.text('Default')))).toBeVisible();
    });

    it('MM-T3376_2 should display correct Global default value on channel info mobile notifications options', async () => {
        // # Set global notifications to never
        await setGlobalNotificationsTo('never');

        // * Verify Global default (Never) is displayed
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.notificationPreferenceAction.tap();
        await expect(element(by.text(`${ChannelNotificationPreferenceScreen.optionDefaultText} (Never)`))).toBeVisible();

        // # Go back to channel info screen
        ChannelNotificationPreferenceScreen.back();
        await ChannelInfoScreen.close();

        // # Set global notifications to all
        await setGlobalNotificationsTo('all');

        // * Verify Global default (All) is displayed
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.notificationPreferenceAction.tap();
        await expect(element(by.text(`${ChannelNotificationPreferenceScreen.optionDefaultText} (All)`))).toBeVisible();

        // # Tap on back button
        ChannelNotificationPreferenceScreen.back();
    });
});

async function setGlobalNotificationsTo(pushKey) {
    // # Open settings drawer
    await ChannelScreen.settingsSidebarDrawerButton.tap();
    await SettingsSidebar.toBeVisible();

    // # Open general settings screen
    await SettingsSidebar.settingsAction.tap();
    await GeneralSettingsScreen.toBeVisible();

    // # Open notification settings screen
    await GeneralSettingsScreen.notificationsAction.tap();
    await NotificationSettingsScreen.toBeVisible();

    // # Open notifications settings mobile screen
    await NotificationSettingsScreen.mobileAction.tap();
    await NotificationSettingsMobileScreen.toBeVisible();

    // # Tap on Send Notifications option if Android
    if (isAndroid()) {
        await NotificationSettingsMobileScreen.pushAction.tap();
        await expect(NotificationSettingsMobileScreen.pushModal).toBeVisible();
    }

    // # Tap on push activity option
    await NotificationSettingsMobileScreen.getPushActionFor(pushKey).tap();

    // # Tap on Save button if Android
    if (isAndroid()) {
        await NotificationSettingsMobileScreen.pushModalSaveButton.tap();
    }

    // # Navigate back to channel screen
    await NotificationSettingsMobileScreen.toBeVisible();
    await NotificationSettingsMobileScreen.back();
    await NotificationSettingsScreen.back();
    await GeneralSettingsScreen.close();
}
