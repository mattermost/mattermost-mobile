// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DisplaySettingsScreen} from '@support/ui/screen';
import {isIos, tapNativeBackButton, timeouts} from '@support/utils';
import {expect} from 'detox';

class TimezoneDisplaySettingsScreen {
    testID = {
        timezoneDisplaySettingsScreen: 'timezone_display_settings.screen',
        backButton: 'navigation.header.back',
        scrollView: 'timezone_display_settings.scroll_view',
        automaticOptionToggledOff: 'timezone_display_settings.automatic.option.toggled.false.button',
        automaticOptionToggledOn: 'timezone_display_settings.automatic.option.toggled.true.button',
        manualOption: 'timezone_display_settings.manual.option',
        manualOptionInfo: 'timezone_display_settings.manual.option.info',
    };

    timezoneDisplaySettingsScreen = element(by.id(this.testID.timezoneDisplaySettingsScreen));

    // expo-router native stack screen — the custom NavigationHeader's
    // 'navigation.header.back' testID is not rendered here. iOS uses
    // `accessibilityLabel="Back"`, Android uses the Toolbar's default
    // navigation-icon contentDescription "Navigate up".
    get backButton(): Detox.NativeElement {
        return isIos()
            ? element(by.label('Back')).atIndex(0)
            : element(by.label('Navigate up')).atIndex(0);
    }

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
        // Use platform-native back chevron: Android via device.pressBack(),
        // iOS via by.label('Back'). The custom NavigationHeader's testID
        // does not exist on this screen (expo-router native stack).
        await tapNativeBackButton();
        await waitFor(this.timezoneDisplaySettingsScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
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
