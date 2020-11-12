// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsSidebar} from '@support/ui/component';

class GeneralSettingsScreen {
    testID = {
        generalSettingsScreen: 'general_settings.screen',
        closeSettingsButton: 'close.settings.button',
        notificationsAction: 'general_settings.notifications.action',
        displayAction: 'general_settings.display.action',
        selectTeamAction: 'general_settings.select_team.action',
        advancedAction: 'general_settings.advanced.action',
        checkForUpgradeAction: 'general_settings.checkForUpgrade.action',
        aboutAction: 'general_settings.about.action',
        helpAction: 'general_settings.help.action',
        reportAction: 'general_settings.report.action',
    }

    generalSettingsScreen = element(by.id(this.testID.generalSettingsScreen));
    closeSettingsButton = element(by.id(this.testID.closeSettingsButton));
    notificationsAction = element(by.id(this.testID.notificationsAction));
    displayAction = element(by.id(this.testID.displayAction));
    selectTeamAction = element(by.id(this.testID.selectTeamAction));
    advancedAction = element(by.id(this.testID.advancedAction));
    checkForUpgradeAction = element(by.id(this.testID.checkForUpgradeAction));
    aboutAction = element(by.id(this.testID.aboutAction));
    helpAction = element(by.id(this.testID.helpAction));
    reportAction = element(by.id(this.testID.reportAction));

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
