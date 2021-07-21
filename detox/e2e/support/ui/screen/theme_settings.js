// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DisplaySettingsScreen} from '@support/ui/screen';

class ThemeSettingsScreen {
    testID = {
        themeDisplaySettingsScreen: 'theme_settings.screen',
        backButton: 'screen.back.button',
        osSyncSwitch: 'os_sync.switch',

        allThemesDefaultSelected: 'all_themes.default.selected',
        allThemesOrganization: 'all_themes.organization',
        allThemesOrganizationSelected: 'all_themes.organization.selected',
        allThemesMattermostDark: 'all_themes.mattermostDark',
        allThemesCustomThemeItemSelected: 'all_themes.custom_theme_item.selected',

        lightThemesDefaultSelected: 'light_themes.default.selected',
        lightThemesOrganizationSelected: 'light_themes.organization.selected',
        lightThemesCustomThemeItemSelected: 'light_themes.custom_theme_item.selected',

        darkThemesMattermostDarkSelected: 'dark_themes.mattermostDark.selected',
        darkThemesWindows10Selected: 'dark_themes.windows10.selected',
        darkThemesCustomThemeItemSelected: 'dark_themes.custom_theme_item.selected',
    }

    themeDisplaySettingsScreen = element(by.id(this.testID.themeDisplaySettingsScreen));
    backButton = element(by.id(this.testID.backButton));
    osSyncSwitch = element(by.id(this.testID.osSyncSwitch));

    allThemesDefaultSelected = element(by.id(this.testID.allThemesDefaultSelected));
    allThemesOrganization = element(by.id(this.testID.allThemesOrganization));
    allThemesOrganizationSelected = element(by.id(this.testID.allThemesOrganizationSelected));
    allThemesMattermostDark = element(by.id(this.testID.allThemesMattermostDark));
    allThemesCustomThemeItemSelected = element(by.id(this.testID.allThemesCustomThemeItemSelected));

    lightThemesDefaultSelected = element(by.id(this.testID.lightThemesDefaultSelected));
    lightThemesOrganizationSelected = element(by.id(this.testID.lightThemesOrganizationSelected));
    lightThemesCustomThemeItemSelected = element(by.id(this.testID.lightThemesCustomThemeItemSelected));

    darkThemesMattermostDarkSelected = element(by.id(this.testID.darkThemesMattermostDarkSelected));
    darkThemesWindows10Selected = element(by.id(this.testID.darkThemesWindows10Selected));
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
}
const themeSettingsScreen = new ThemeSettingsScreen();
export default themeSettingsScreen;
