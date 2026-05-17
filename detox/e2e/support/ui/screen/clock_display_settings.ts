// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DisplaySettingsScreen} from '@support/ui/screen';
import {isIos, tapNativeBackButton, timeouts} from '@support/utils';

class ClockDisplaySettingsScreen {
    testID = {
        clockDisplaySettingsScreen: 'clock_display_settings.screen',
        backButton: 'navigation.header.back',
        scrollView: 'clock_display_settings.scroll_view',
        twelveHourOption: 'clock_display_settings.twelve_hour.option',
        twelveHourOptionSelected: 'clock_display_settings.twelve_hour.option.selected',
        twentyFourHourOption: 'clock_display_settings.twenty_four_hour.option',
        twentyFourHourOptionSelected: 'clock_display_settings.twenty_four_hour.option.selected',
    };

    clockDisplaySettingsScreen = element(by.id(this.testID.clockDisplaySettingsScreen));

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
        // Use platform-native back chevron: Android via device.pressBack(),
        // iOS via by.label('Back'). The custom NavigationHeader's testID
        // does not exist on this screen (expo-router native stack).
        await tapNativeBackButton();
        await waitFor(this.clockDisplaySettingsScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const clockDisplaySettingsScreen = new ClockDisplaySettingsScreen();
export default clockDisplaySettingsScreen;
