// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    DisplaySettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    SettingsScreen,
    ThemeDisplaySettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - Theme Display Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, open display settings screen, and go to theme display settings
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await DisplaySettingsScreen.open();
        await ThemeDisplaySettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on theme display settings screen
        await ThemeDisplaySettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await ThemeDisplaySettingsScreen.back();
        await DisplaySettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5111_1 - should match elements on theme display settings screen', async () => {
        // * Verify basic elements on theme display settings screen
        await expect(ThemeDisplaySettingsScreen.backButton).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.denimOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.sapphireOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.quartzOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.indigoOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.onyxOption).toBeVisible();
    });

    it('MM-T5111_2 - should be able to select a theme and save by tapping navigation back button', async () => {
        // # Tap on a sapphire option and tap on back button
        await ThemeDisplaySettingsScreen.sapphireOption.tap();
        await ThemeDisplaySettingsScreen.back();

        // * Verify on display settings screen and sapphire is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Sapphire');

        // # Go back to theme display settings screen
        await ThemeDisplaySettingsScreen.open();

        // * Verify sapphire option is selected
        await expect(ThemeDisplaySettingsScreen.sapphireOptionSelected).toBeVisible();

        // # Tap on denim option and tap on back button
        await ThemeDisplaySettingsScreen.denimOption.tap();
        await ThemeDisplaySettingsScreen.back();

        // * Verify on display settings screen and denim is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Denim');

        // # Go back to theme display settings screen
        await ThemeDisplaySettingsScreen.open();

        // * Verify denim option is selected
        await expect(ThemeDisplaySettingsScreen.denimOptionSelected).toBeVisible();
    });

    it('MM-T5111_3 - should display auto-switch toggle on theme settings screen', async () => {
        // * Verify the auto-switch toggle is visible and initially off
        await expect(ThemeDisplaySettingsScreen.autoSwitchToggleOff).toBeVisible();

        // * Verify all 5 theme options are still visible alongside the toggle
        await expect(ThemeDisplaySettingsScreen.denimOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.sapphireOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.quartzOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.indigoOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.onyxOption).toBeVisible();
    });

    it('MM-T5111_4 - should be able to enable auto-switch and select light/dark themes', async () => {
        // # Toggle auto-switch on
        await ThemeDisplaySettingsScreen.toggleAutoSwitchOn();

        // * Verify theme tiles are still visible (light section)
        await expect(ThemeDisplaySettingsScreen.getLightThemeOption('denim')).toBeVisible();

        // # Select Sapphire as light theme
        await ThemeDisplaySettingsScreen.selectLightTheme('sapphire');

        // # Select Indigo as dark theme
        await ThemeDisplaySettingsScreen.selectDarkTheme('indigo');

        // # Tap back to save
        await ThemeDisplaySettingsScreen.back();

        // * Verify display settings shows "Auto" for theme info
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Auto');

        // # Re-open theme settings
        await ThemeDisplaySettingsScreen.open();

        // * Verify auto-switch is on
        await expect(ThemeDisplaySettingsScreen.autoSwitchToggleOn).toBeVisible();

        // * Verify Sapphire is selected in light section
        await expect(ThemeDisplaySettingsScreen.sapphireOptionSelected).toBeVisible();

        // # Scroll to dark section
        // * Verify Indigo is selected in dark section
        await waitFor(ThemeDisplaySettingsScreen.indigoOptionSelected).toBeVisible().whileElement(by.id(ThemeDisplaySettingsScreen.testID.scrollView)).scroll(50, 'down');
    });

    it('MM-T5111_5 - should persist light and dark theme changes independently', async () => {
        // # Change only the light theme to Quartz
        await ThemeDisplaySettingsScreen.selectLightTheme('quartz');

        // # Tap back to save
        await ThemeDisplaySettingsScreen.back();

        // * Verify display settings still shows "Auto"
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Auto');

        // # Re-open theme settings
        await ThemeDisplaySettingsScreen.open();

        // * Verify Quartz is selected in the light section
        await expect(ThemeDisplaySettingsScreen.quartzOptionSelected).toBeVisible();

        // * Verify Indigo is still selected in the dark section (unchanged)
        await waitFor(ThemeDisplaySettingsScreen.indigoOptionSelected).toBeVisible().whileElement(by.id(ThemeDisplaySettingsScreen.testID.scrollView)).scroll(50, 'down');

        // # Change only the dark theme to Onyx
        await ThemeDisplaySettingsScreen.selectDarkTheme('onyx');

        // # Tap back to save
        await ThemeDisplaySettingsScreen.back();

        // # Re-open theme settings
        await ThemeDisplaySettingsScreen.open();

        // * Verify Quartz is still selected in the light section
        await expect(ThemeDisplaySettingsScreen.quartzOptionSelected).toBeVisible();

        // * Verify Onyx is now selected in the dark section
        await waitFor(ThemeDisplaySettingsScreen.onyxOptionSelected).toBeVisible().whileElement(by.id(ThemeDisplaySettingsScreen.testID.scrollView)).scroll(50, 'down');
    });

    it('MM-T5111_6 - should be able to disable auto-switch and return to single theme selection', async () => {
        // # Toggle auto-switch off
        await ThemeDisplaySettingsScreen.toggleAutoSwitchOff();

        // * Verify standard single theme tiles are shown
        await expect(ThemeDisplaySettingsScreen.denimOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.sapphireOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.quartzOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.indigoOption).toBeVisible();
        await expect(ThemeDisplaySettingsScreen.onyxOption).toBeVisible();

        // # Select Denim theme
        await ThemeDisplaySettingsScreen.denimOption.tap();

        // # Tap back to save
        await ThemeDisplaySettingsScreen.back();

        // * Verify display settings shows "Denim" (not "Auto")
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Denim');

        // # Re-open theme settings
        await ThemeDisplaySettingsScreen.open();

        // * Verify auto-switch is off
        await expect(ThemeDisplaySettingsScreen.autoSwitchToggleOff).toBeVisible();

        // * Verify Denim is selected
        await expect(ThemeDisplaySettingsScreen.denimOptionSelected).toBeVisible();
    });
});
