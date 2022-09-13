// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DisplaySettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class ClockDisplaySettingsScreen {
    testID = {
        clockDisplaySettingsScreen: 'clock_display_settings.screen',
        backButton: 'screen.back.button',
        scrollView: 'clock_display_settings.scroll_view',
        twelveHourOption: 'clock_display_settings.twelve_hour.option',
        twelveHourOptionSelected: 'clock_display_settings.twelve_hour.option.selected',
        twentyFourHourOption: 'clock_display_settings.twenty_four_hour.option',
        twentyFourHourOptionSelected: 'clock_display_settings.twenty_four_hour.option.selected',
    };

    clockDisplaySettingsScreen = element(by.id(this.testID.clockDisplaySettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    scrollView = element(by.id(this.testID.scrollView));
    twelveHourOption = element(by.id(this.testID.twelveHourOption));
    twelveHourOptionSelected = element(by.id(this.testID.twelveHourOptionSelected));
    twentyFourHourOption = element(by.id(this.testID.twentyFourHourOption));
    twentyFourHourOptionSelected = element(by.id(this.testID.twentyFourHourOptionSelected));

    toBeVisible = async () => {
        await waitFor(this.clockDisplaySettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.clockDisplaySettingsScreen;
    };

    open = async () => {
        // # Open clock display settings screen
        await DisplaySettingsScreen.clockDisplayOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.clockDisplaySettingsScreen).not.toBeVisible();
    };
}

const clockDisplaySettingsScreen = new ClockDisplaySettingsScreen();
export default clockDisplaySettingsScreen;
