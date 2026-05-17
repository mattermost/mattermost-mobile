// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {isIos, tapNativeBackButton, timeouts} from '@support/utils';
import {expect} from 'detox';

class AdvancedSettingsScreen {
    testID = {
        advancedSettingsScreen: 'advanced_settings.screen',
        backButton: 'navigation.header.back',
        scrollView: 'advanced_settings.scroll_view',
        deleteDataOption: 'advanced_settings.delete_data.option',
    };

    advancedSettingsScreen = element(by.id(this.testID.advancedSettingsScreen));

    // expo-router native stack screen — the iOS back chevron has no testID,
    // only `accessibilityLabel="Back"`. Android still exposes the testID via
    // react-native-screens. Platform-aware getter keeps the existing test
    // assertion `expect(backButton).toBeVisible()` working on both platforms.
    get backButton(): Detox.NativeElement {
        return isIos()
            ? element(by.label('Back')).atIndex(0)
            : element(by.id(this.testID.backButton));
    }

    scrollView = element(by.id(this.testID.scrollView));
    deleteDataOption = element(by.id(this.testID.deleteDataOption));

    toBeVisible = async () => {
        await waitFor(this.advancedSettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.advancedSettingsScreen;
    };

    open = async () => {
        // # Open advanced settings screen
        await SettingsScreen.advancedSettingsOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        // Use platform-native back chevron: Android via device.pressBack(),
        // iOS via by.label('Back'). The custom NavigationHeader's testID
        // does not exist on this screen (expo-router native stack).
        await tapNativeBackButton();
        await expect(this.advancedSettingsScreen).not.toBeVisible();
    };
}

const advancedSettingsScreen = new AdvancedSettingsScreen();
export default advancedSettingsScreen;
