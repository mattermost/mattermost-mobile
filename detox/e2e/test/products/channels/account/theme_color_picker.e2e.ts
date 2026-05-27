// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T280: Theme Colors - Color picker
 * - MM-T294: RN apps: Custom theme
 */

import {Preference, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    ChannelListScreen,
    DisplaySettingsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    SettingsScreen,
    ThemeDisplaySettingsScreen,
} from '@support/ui/screen';
import {timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

// A minimal custom theme JSON — type must be 'custom' for the CustomTheme component to render
const CUSTOM_THEME_JSON = JSON.stringify({
    type: 'custom',
    sidebarBg: '#1e325c',
    sidebarText: '#ffffff',
    sidebarUnreadText: '#ffffff',
    sidebarTextHoverBg: '#233c74',
    sidebarTextActiveBorder: '#579eff',
    sidebarTextActiveColor: '#ffffff',
    sidebarHeaderBg: '#1e325c',
    sidebarTeamBarBg: '#1e325c',
    sidebarHeaderTextColor: '#ffffff',
    onlineIndicator: '#3db887',
    awayIndicator: '#ffd470',
    dndIndicator: '#f74343',
    mentionBg: '#579eff',
    mentionColor: '#ffffff',
    mentionHighlightBg: '#ffe577',
    mentionHighlightLink: '#2d6fb1',
    centerChannelBg: '#ffffff',
    centerChannelColor: '#3f4350',
    newMessageSeparator: '#ff8800',
    linkColor: '#2d6fb1',
    buttonBg: '#579eff',
    buttonColor: '#ffffff',
    errorTextColor: '#fd5960',
    codeTheme: 'github',
});

describe('Account - Theme Color Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // # Set a custom theme preference via API so the CustomTheme option renders in the theme screen
        // The 'custom.option' only renders when theme.type === 'custom' in the app state.
        await Preference.apiSaveUserPreferences(siteOneUrl, user.id, [{
            user_id: user.id,
            category: 'theme',
            name: team.id,
            value: CUSTOM_THEME_JSON,
        }]);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T280 - Theme Colors - Color picker (custom theme option is available)', async () => {
        // # Go to Settings -> Display -> Theme
        await AccountScreen.open();
        await SettingsScreen.open();
        await DisplaySettingsScreen.open();
        await ThemeDisplaySettingsScreen.open();

        // * Verify the theme display settings screen is visible
        await ThemeDisplaySettingsScreen.toBeVisible();

        // * Verify the "Custom Theme" option is present in the list
        // Use whileElement scroll so the scroll only happens if the option is not yet visible
        await waitFor(ThemeDisplaySettingsScreen.customOption).toBeVisible().
            whileElement(by.id(ThemeDisplaySettingsScreen.testID.scrollView)).scroll(100, 'down');
        await expect(ThemeDisplaySettingsScreen.customOption).toBeVisible();

        // # Tap on Custom Theme to select it
        await ThemeDisplaySettingsScreen.customOption.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify custom theme option is selected (check mark visible)
        await expect(ThemeDisplaySettingsScreen.customOptionSelected).toBeVisible();

        // # Tap back to save the custom theme selection
        await ThemeDisplaySettingsScreen.back();

        // * Verify on display settings screen and custom theme is shown
        // The theme.type value for a custom theme is 'custom' (lowercase) which is what the info field displays
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('custom');

        // # Go back into theme settings and restore Denim (default)
        await ThemeDisplaySettingsScreen.open();
        await ThemeDisplaySettingsScreen.denimOption.tap();
        await ThemeDisplaySettingsScreen.back();

        // * Verify Denim is restored
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Denim');

        // # Navigate back to channel list
        await DisplaySettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.channelListTab.tap();
    });

    it('MM-T294 - RN apps: Custom theme (select custom then switch back to default)', async () => {
        // # Re-set the custom theme via API so 'custom.option' is rendered in the theme screen.
        // The CustomTheme component only mounts when the user's current theme.type === 'custom'.
        // After MM-T280 switched the user back to Denim, we need to restore the custom preference
        // before opening the theme screen so the component mounts with customTheme state set.
        await Preference.apiSaveUserPreferences(siteOneUrl, testUser.id, [{
            user_id: testUser.id,
            category: 'theme',
            name: testTeam.id,
            value: CUSTOM_THEME_JSON,
        }]);
        await device.reloadReactNative();

        // # Wait for channel list to become visible without requiring bridge idle.
        // After reloadReactNative the app syncs with the server (network activity keeps bridge busy).
        // waitForElementToBeVisible polls without waiting for idle so we can proceed once UI is ready.
        await waitForElementToBeVisible(element(by.id('channel_list.screen')), timeouts.ONE_MIN);

        // # Wait for initial network sync to settle before navigating.
        // Without this wait, subsequent bridge-idle-requiring taps timeout while sync is in flight.
        await wait(timeouts.FIVE_SEC);

        // # Log in on browser/desktop and go to Settings -> Display -> Edit theme -> Custom theme
        // (Covered here as mobile-only: Account -> Settings -> Display -> Theme -> Custom Theme)
        await AccountScreen.open();
        await SettingsScreen.open();
        await DisplaySettingsScreen.open();
        await ThemeDisplaySettingsScreen.open();

        // * Verify on theme display settings screen
        await ThemeDisplaySettingsScreen.toBeVisible();

        // # Use color pickers to set a couple custom colors — select Custom Theme
        // Use whileElement scroll so the scroll only happens if the option is not yet visible
        await waitFor(ThemeDisplaySettingsScreen.customOption).toBeVisible().
            whileElement(by.id(ThemeDisplaySettingsScreen.testID.scrollView)).scroll(100, 'down');
        await ThemeDisplaySettingsScreen.customOption.tap();
        await wait(timeouts.ONE_SEC);

        // # Tap back to save the theme selection
        await ThemeDisplaySettingsScreen.back();
        await DisplaySettingsScreen.toBeVisible();

        // # Return to theme settings to verify the selected custom theme
        await ThemeDisplaySettingsScreen.open();

        // Use whileElement scroll so the scroll only happens if the option is not yet visible
        await waitFor(ThemeDisplaySettingsScreen.customOptionSelected).toBeVisible().
            whileElement(by.id(ThemeDisplaySettingsScreen.testID.scrollView)).scroll(100, 'down');

        // * Verify "Custom Theme" is listed with a check mark at the bottom
        await expect(ThemeDisplaySettingsScreen.customOptionSelected).toBeVisible();

        // # Go back into theme settings and select one of the default themes (Sapphire)
        await ThemeDisplaySettingsScreen.sapphireOption.tap();

        // # Tap the back arrow to save
        await ThemeDisplaySettingsScreen.back();

        // * Verify the default theme (Sapphire) that was selected in the last step displays
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Sapphire');

        // # Restore Denim (default) for clean state
        await ThemeDisplaySettingsScreen.open();
        await ThemeDisplaySettingsScreen.denimOption.tap();
        await ThemeDisplaySettingsScreen.back();

        // * Verify Denim is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Denim');

        // # Navigate back to channel list
        await DisplaySettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.channelListTab.tap();
    });
});
