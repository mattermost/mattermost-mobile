// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class AdvancedSettingsScreen {
    testID = {
        advancedSettingsScreen: 'advanced_settings.screen',
        backButton: 'screen.back.button',
        scrollView: 'advanced_settings.scroll_view',
        deleteDataOption: 'advanced_settings.delete_data.option',
    };

    advancedSettingsScreen = element(by.id(this.testID.advancedSettingsScreen));
    backButton = element(by.id(this.testID.backButton));
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
        await this.backButton.tap();
        await expect(this.advancedSettingsScreen).not.toBeVisible();
    };
}

const advancedSettingsScreen = new AdvancedSettingsScreen();
export default advancedSettingsScreen;
