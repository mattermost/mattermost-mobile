// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class DisplaySettingsScreen {
    testID = {
        displaySettingsScreen: 'display_settings.screen',
        backButton: 'screen.back.button',
        scrollView: 'display_settings.scroll_view',
        themeOption: 'display_settings.theme.option',
        themeOptionInfo: 'display_settings.theme.option.info',
        clockDisplayOption: 'display_settings.clock_display.option',
        clockDisplayOptionInfo: 'display_settings.clock_display.option.info',
        timezoneOption: 'display_settings.timezone.option',
        timezoneOptionInfo: 'display_settings.timezone.option.info',
    };

    displaySettingsScreen = element(by.id(this.testID.displaySettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    scrollView = element(by.id(this.testID.scrollView));
    themeOption = element(by.id(this.testID.themeOption));
    themeOptionInfo = element(by.id(this.testID.themeOptionInfo));
    clockDisplayOption = element(by.id(this.testID.clockDisplayOption));
    clockDisplayOptionInfo = element(by.id(this.testID.clockDisplayOptionInfo));
    timezoneOption = element(by.id(this.testID.timezoneOption));
    timezoneOptionInfo = element(by.id(this.testID.timezoneOptionInfo));

    toBeVisible = async () => {
        await waitFor(this.displaySettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.displaySettingsScreen;
    };

    open = async () => {
        // # Open display settings screen
        await SettingsScreen.displayOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.displaySettingsScreen).not.toBeVisible();
    };
}

const displaySettingsScreen = new DisplaySettingsScreen();
export default displaySettingsScreen;
