// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {isIos, tapNativeBackButton, timeouts} from '@support/utils';
import {waitFor} from 'detox';

class DisplaySettingsScreen {
    testID = {
        displaySettingsScreen: 'display_settings.screen',
        backButton: 'navigation.header.back',
        scrollView: 'display_settings.scroll_view',
        themeOption: 'display_settings.theme.option',
        themeOptionInfo: 'display_settings.theme.option.info',
        clockDisplayOption: 'display_settings.clock_display.option',
        clockDisplayOptionInfo: 'display_settings.clock_display.option.info',
        timezoneOption: 'display_settings.timezone.option',
        timezoneOptionInfo: 'display_settings.timezone.option.info',
    };

    displaySettingsScreen = element(by.id(this.testID.displaySettingsScreen));

    // Native-stack back chevron via accessibility label.
    get backButton(): Detox.NativeElement {
        return isIos()
            ? element(by.label('Back')).atIndex(0)
            : element(by.label('Navigate up')).atIndex(0);
    }

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
        // Native-stack back chevron.
        await tapNativeBackButton();
        await waitFor(this.displaySettingsScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const displaySettingsScreen = new DisplaySettingsScreen();
export default displaySettingsScreen;
