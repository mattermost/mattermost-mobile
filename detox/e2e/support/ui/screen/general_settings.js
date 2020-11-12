// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsSidebar} from '@support/ui/component';

class GeneralSettingsScreen {
    testID = {
        generalSettingsScreen: 'general_settings.screen',
        closeSettingsButton: 'close.settings.button',
        notificationsAction: 'general_settings.notifications.action',
    }

    generalSettingsScreen = element(by.id(this.testID.generalSettingsScreen));
    closeSettingsButton = element(by.id(this.testID.closeSettingsButton));
    notificationsAction = element(by.id(this.testID.notificationsAction));

    toBeVisible = async () => {
        await expect(this.generalSettingsScreen).toBeVisible();

        return this.generalSettingsScreen;
    }

    open = async () => {
        // # Open general settings screen
        await SettingsSidebar.settingsAction.tap();

        return this.toBeVisible();
    }

    close = async () => {
        await this.closeSettingsButton.tap();
        await expect(this.generalSettingsScreen).not.toBeVisible();
    }
}

const generalSettingsScreen = new GeneralSettingsScreen();
export default generalSettingsScreen;
