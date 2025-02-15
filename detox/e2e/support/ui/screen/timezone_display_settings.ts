// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DisplaySettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class TimezoneDisplaySettingsScreen {
    testID = {
        timezoneDisplaySettingsScreen: 'timezone_display_settings.screen',
        backButton: 'screen.back.button',
        scrollView: 'timezone_display_settings.scroll_view',
        automaticOptionToggledOff: 'timezone_display_settings.automatic.option.toggled.false.button',
        automaticOptionToggledOn: 'timezone_display_settings.automatic.option.toggled.true.button',
        manualOption: 'timezone_display_settings.manual.option',
        manualOptionInfo: 'timezone_display_settings.manual.option.info',
    };

    timezoneDisplaySettingsScreen = element(by.id(this.testID.timezoneDisplaySettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    scrollView = element(by.id(this.testID.scrollView));
    automaticOptionToggledOff = element(by.id(this.testID.automaticOptionToggledOff));
    automaticOptionToggledOn = element(by.id(this.testID.automaticOptionToggledOn));
    manualOption = element(by.id(this.testID.manualOption));
    manualOptionInfo = element(by.id(this.testID.manualOptionInfo));

    toBeVisible = async () => {
        await waitFor(this.timezoneDisplaySettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.timezoneDisplaySettingsScreen;
    };

    open = async () => {
        // # Open timezone display settings screen
        await DisplaySettingsScreen.timezoneOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.timezoneDisplaySettingsScreen).not.toBeVisible();
    };

    toggleAutomaticOptionOn = async () => {
        await this.automaticOptionToggledOff.tap();
        await expect(this.automaticOptionToggledOn).toBeVisible();
    };

    toggleAutomaticOptionOff = async () => {
        await this.automaticOptionToggledOn.tap();
        await expect(this.automaticOptionToggledOff).toBeVisible();
    };
}

const timezoneDisplaySettingsScreen = new TimezoneDisplaySettingsScreen();
export default timezoneDisplaySettingsScreen;
