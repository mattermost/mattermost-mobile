// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GeneralSettingsScreen} from '@support/ui/screen';

class NotificationSettingsScreen {
    testID = {
        notificationSettingsScreen: 'notification_settings.screen',
        backButton: 'screen.back.button',
        mobileAction: 'notification_settings.mobile.action',
    }

    notificationSettingsScreen = element(by.id(this.testID.notificationSettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    mobileAction = element(by.id(this.testID.mobileAction));

    toBeVisible = async () => {
        await expect(this.notificationSettingsScreen).toBeVisible();

        return this.notificationSettingsScreen;
    }

    open = async () => {
        // # Open notification settings screen
        await GeneralSettingsScreen.notificationsAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.notificationSettingsScreen).not.toBeVisible();
    }
}

const notificationSettingsScreen = new NotificationSettingsScreen();
export default notificationSettingsScreen;
