// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect} from 'detox';

import {GeneralSettingsScreen} from '@support/ui/screen';

class DisplaySettingsScreen {
    testID = {
        displaySettingsScreen: 'display_settings.screen',
        backButton: 'screen.back.button',
        clockDisplayAction: 'display_settings.clock_display.action',
        themeAction: 'display_settings.theme.action',
        timezoneAction: 'display_settings.timezone.action',
    };

    displaySettingsScreen = element(by.id(this.testID.displaySettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    clockDisplayAction = element(by.id(this.testID.clockDisplayAction));
    themeAction = element(by.id(this.testID.themeAction));
    timezoneAction = element(by.id(this.testID.timezoneAction));

    toBeVisible = async () => {
        await expect(this.displaySettingsScreen).toBeVisible();

        return this.displaySettingsScreen;
    };

    open = async () => {
        // # Open display settings screen
        await GeneralSettingsScreen.displayAction.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.displaySettingsScreen).not.toBeVisible();
    };
}

const displaySettingsScreen = new DisplaySettingsScreen();
export default displaySettingsScreen;
