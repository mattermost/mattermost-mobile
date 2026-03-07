// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DisplaySettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class ThemeDisplaySettingsScreen {
    testID = {
        themeDisplaySettingsScreen: 'theme_display_settings.screen',
        backButton: 'screen.back.button',
        scrollView: 'theme_display_settings.scroll_view',
        autoSwitchToggleOff: 'theme_display_settings.auto_switch.toggle.toggled.false.button',
        autoSwitchToggleOn: 'theme_display_settings.auto_switch.toggle.toggled.true.button',
        denimOption: 'theme_display_settings.denim.option',
        denimOptionSelected: 'theme_display_settings.denim.option.selected',
        sapphireOption: 'theme_display_settings.sapphire.option',
        sapphireOptionSelected: 'theme_display_settings.sapphire.option.selected',
        quartzOption: 'theme_display_settings.quartz.option',
        quartzOptionSelected: 'theme_display_settings.quartz.option.selected',
        indigoOption: 'theme_display_settings.indigo.option',
        indigoOptionSelected: 'theme_display_settings.indigo.option.selected',
        onyxOption: 'theme_display_settings.onyx.option',
        onyxOptionSelected: 'theme_display_settings.onyx.option.selected',
        customOption: 'theme_display_settings.custom.option',
        customOptionSelected: 'theme_display_settings.custom.option.selected',
    };

    themeDisplaySettingsScreen = element(by.id(this.testID.themeDisplaySettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    scrollView = element(by.id(this.testID.scrollView));
    autoSwitchToggleOff = element(by.id(this.testID.autoSwitchToggleOff));
    autoSwitchToggleOn = element(by.id(this.testID.autoSwitchToggleOn));
    denimOption = element(by.id(this.testID.denimOption));
    denimOptionSelected = element(by.id(this.testID.denimOptionSelected));
    sapphireOption = element(by.id(this.testID.sapphireOption));
    sapphireOptionSelected = element(by.id(this.testID.sapphireOptionSelected));
    quartzOption = element(by.id(this.testID.quartzOption));
    quartzOptionSelected = element(by.id(this.testID.quartzOptionSelected));
    indigoOption = element(by.id(this.testID.indigoOption));
    indigoOptionSelected = element(by.id(this.testID.indigoOptionSelected));
    onyxOption = element(by.id(this.testID.onyxOption));
    onyxOptionSelected = element(by.id(this.testID.onyxOptionSelected));
    customOption = element(by.id(this.testID.customOption));
    customOptionSelected = element(by.id(this.testID.customOptionSelected));

    toBeVisible = async () => {
        await waitFor(this.themeDisplaySettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.themeDisplaySettingsScreen;
    };

    open = async () => {
        // # Open theme display settings screen
        await DisplaySettingsScreen.themeOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.themeDisplaySettingsScreen).not.toBeVisible();
    };

    toggleAutoSwitchOn = async () => {
        await this.autoSwitchToggleOff.tap();
        await expect(this.autoSwitchToggleOn).toBeVisible();
    };

    toggleAutoSwitchOff = async () => {
        await this.autoSwitchToggleOn.tap();
        await expect(this.autoSwitchToggleOff).toBeVisible();
    };

    // When auto-switch is on, theme tiles appear in both light (index 0) and dark (index 1) sections.
    getLightThemeOption = (themeKey: string) => {
        return element(by.id(`theme_display_settings.${themeKey}.option`)).atIndex(0);
    };

    getDarkThemeOption = (themeKey: string) => {
        return element(by.id(`theme_display_settings.${themeKey}.option`)).atIndex(1);
    };

    selectLightTheme = async (themeKey: string) => {
        await this.scrollView.scrollTo('top');
        const option = this.getLightThemeOption(themeKey);
        await option.tap();
    };

    selectDarkTheme = async (themeKey: string) => {
        const option = this.getDarkThemeOption(themeKey);
        await waitFor(option).toBeVisible().whileElement(by.id(this.testID.scrollView)).scroll(50, 'down');
        await option.tap();
    };
}

const themeDisplaySettingsScreen = new ThemeDisplaySettingsScreen();
export default themeDisplaySettingsScreen;
