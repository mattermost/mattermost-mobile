// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DisplaySettingsScreen} from '@support/ui/screen';

class ThemeSettingsScreen {
    testID = {
        themeDisplaySettingsScreen: 'theme_settings.screen',
        themeSettingsScroll: 'theme_settings.scroll',
        backButton: 'screen.back.button',
        osSyncSwitch: 'os_sync.switch',

        allThemesDenimSelected: 'all_themes.denim.selected',
        allThemesSapphire: 'all_themes.sapphire',
        allThemesSapphireSelected: 'all_themes.sapphire.selected',
        allThemesOnyx: 'all_themes.onyx',
        allThemesCustomThemeItemSelected: 'all_themes.custom_theme_item.selected',

        lightThemesDenimSelected: 'light_themes.denim.selected',
        lightThemesSapphireSelected: 'light_themes.sapphire.selected',
        lightThemesCustomThemeItemSelected: 'light_themes.custom_theme_item.selected',

        darkThemesOnyxSelected: 'dark_themes.onyx.selected',
        darkThemesIndigoSelected: 'dark_themes.indigo.selected',
        darkThemesCustomThemeItemSelected: 'dark_themes.custom_theme_item.selected',
    }

    themeDisplaySettingsScreen = element(by.id(this.testID.themeDisplaySettingsScreen));
    themeSettingsScroll = element(by.id(this.testID.themeSettingsScroll));
    backButton = element(by.id(this.testID.backButton));
    osSyncSwitch = element(by.id(this.testID.osSyncSwitch));

    allThemesDenimSelected = element(by.id(this.testID.allThemesDenimSelected));
    allThemesSapphire = element(by.id(this.testID.allThemesSapphire));
    allThemesSapphireSelected = element(by.id(this.testID.allThemesSapphireSelected));
    allThemesOnyx = element(by.id(this.testID.allThemesOnyx));
    allThemesCustomThemeItemSelected = element(by.id(this.testID.allThemesCustomThemeItemSelected));

    lightThemesDenimSelected = element(by.id(this.testID.lightThemesDenimSelected));
    lightThemesSapphireSelected = element(by.id(this.testID.lightThemesSapphireSelected));
    lightThemesCustomThemeItemSelected = element(by.id(this.testID.lightThemesCustomThemeItemSelected));

    darkThemesOnyxSelected = element(by.id(this.testID.darkThemesOnyxSelected));
    darkThemesIndigoSelected = element(by.id(this.testID.darkThemesIndigoSelected));
    darkThemesCustomThemeItemSelected = element(by.id(this.testID.darkThemesCustomThemeItemSelected));

    toBeVisible = async () => {
        await expect(this.themeDisplaySettingsScreen).toBeVisible();
        return this.themeDisplaySettingsScreen;
    }

    open = async () => {
        // # Open theme display settings screen
        await DisplaySettingsScreen.themeAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.themeDisplaySettingsScreen).not.toBeVisible();
    }

    scrollTop = async () => {
        return this.themeSettingsScroll.scroll(500, 'up');
    }

    scrollBottom = async () => {
        return this.themeSettingsScroll.scroll(500, 'down');
    }
}
const themeSettingsScreen = new ThemeSettingsScreen();
export default themeSettingsScreen;
