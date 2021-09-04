// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup, Preference, Team} from '@support/server_api';
import {TeamsList} from '@support/ui/component';
import {ChannelScreen, DisplaySettingsScreen, GeneralSettingsScreen, ThemeSettingsScreen} from '@support/ui/screen';

const customLight = {
    type: 'custom',
    awayIndicator: '#D4B579',
    buttonBg: '#66CCCC',
    buttonColor: '#FFFFFF',
    centerChannelBg: '#FFFFFF',
    centerChannelColor: '#444444',
    codeTheme: 'github',
    linkColor: '#3DADAD',
    mentionBg: '#66CCCC',
    mentionColor: '#FFFFFF',
    mentionHighlightBg: '#3DADAD',
    mentionHighlightLink: '#FFFFFF',
    newMessageSeparator: '#F2777A',
    onlineIndicator: '#52ADAD',
    sidebarBg: '#F2F0EC',
    sidebarHeaderBg: '#E8E6DF',
    sidebarHeaderTextColor: '#424242',
    sidebarText: '#2E2E2E',
    sidebarTextActiveBorder: '#66CCCC',
    sidebarTextActiveColor: '#594545',
    sidebarTextHoverBg: '#E0E0E0',
    sidebarUnreadText: '#515151',
};

const customDark = {
    type: 'custom',
    awayIndicator: '#fabd2f',
    buttonBg: '#689d6a',
    buttonColor: '#ebdbb2',
    centerChannelBg: '#3c3836',
    centerChannelColor: '#ebdbb2',
    codeTheme: 'monokai',
    errorTextColor: '#fb4934',
    linkColor: '#83a598',
    mentionBg: '#b16286',
    mentionColor: '#fbf1c7',
    mentionHighlightBg: '#d65d0e',
    mentionHighlightLink: '#fbf1c7',
    newMessageSeparator: '#d65d0e',
    onlineIndicator: '#b8bb26',
    sidebarBg: '#282828',
    sidebarHeaderBg: '#1d2021',
    sidebarHeaderTextColor: '#ebdbb2',
    sidebarText: '#ebdbb2',
    sidebarTextActiveBorder: '#d65d0e',
    sidebarTextActiveColor: '#fbf1c7',
    sidebarTextHoverBg: '#d65d0e',
    sidebarUnreadText: '#fe8019',
};

describe('Theme', () => {
    let userId;
    let teamId;
    beforeAll(async () => {
        const {user, team} = await Setup.apiInit();
        userId = user.id;
        teamId = team.id;

        // # Open channel screen
        await ChannelScreen.open(user);

        // # Navigate to theme settings screen
        await ChannelScreen.openSettingsSidebar();
        await GeneralSettingsScreen.open();
        await DisplaySettingsScreen.open();
        await ThemeSettingsScreen.open();
    });

    afterAll(async () => {
        // # Move back to channel screen and logout
        await ThemeSettingsScreen.back();
        await DisplaySettingsScreen.back();
        await GeneralSettingsScreen.close();

        await ChannelScreen.logout();
    });

    beforeEach(async () => {
        await Preference.apiDeleteThemePreferences(userId);
    });

    // Tests inside below `describe` block assume simulator / device have light OS appearance
    describe('OS appearance is light', () => {
        test('switching OS sync on => off not changes currently applied premade theme', async () => {
            // # Switch sync with OS off
            await ThemeSettingsScreen.osSyncSwitch.tap();

            // * Verify that active theme not changed - it is default theme
            await expect(ThemeSettingsScreen.allThemesDenimSelected).toBeVisible();
        });

        test('switching OS sync on => off not changes currently applied custom theme', async () => {
            // # Set custom theme
            await Preference.apiSaveTheme(userId, teamId, customLight);

            // # Switch sync with OS off
            await ThemeSettingsScreen.osSyncSwitch.tap();

            // * Verify that active theme not changed - it is custom theme
            await ThemeSettingsScreen.scrollBottom();
            await expect(ThemeSettingsScreen.allThemesCustomThemeItemSelected).toBeVisible();
        });
    });

    test.each([
        {
            scheme: 'light',
            themeToTap: ThemeSettingsScreen.allThemesSapphire,
            expectedVisible: ThemeSettingsScreen.lightThemesSapphireSelected,
        },
        {
            scheme: 'dark',
            themeToTap: ThemeSettingsScreen.allThemesOnyx,
            expectedVisible: ThemeSettingsScreen.darkThemesOnyxSelected,
        },
    ])(
        'switching OS sync off => on sets current premade theme as $scheme when its centerChannelBg is $scheme',
        async ({themeToTap, expectedVisible}) => {
            // # Switch sync with OS off
            await ThemeSettingsScreen.scrollTop();
            await ThemeSettingsScreen.osSyncSwitch.tap();

            // # Set premade theme
            await ThemeSettingsScreen.scrollBottom();
            await themeToTap.tap();

            // # Switch sync with OS on
            await ThemeSettingsScreen.scrollTop();
            await ThemeSettingsScreen.osSyncSwitch.tap();

            // * Verify that active theme was properly categorized by color scheme
            await ThemeSettingsScreen.scrollBottom();
            await expect(expectedVisible).toBeVisible();
        },
    );

    test.each([
        {
            scheme: 'light',
            themeToSave: customLight,
            expectedLightVisible: ThemeSettingsScreen.lightThemesCustomThemeItemSelected,
            expectedDarkVisible: ThemeSettingsScreen.darkThemesIndigoSelected,
        },
        {
            scheme: 'dark',
            themeToSave: customDark,
            expectedLightVisible: ThemeSettingsScreen.lightThemesDenimSelected,
            expectedDarkVisible: ThemeSettingsScreen.darkThemesCustomThemeItemSelected,
        },
    ])(
        'switching OS sync off => on sets current custom theme as $scheme when its centerChannelBg is $scheme',
        async ({themeToSave, expectedLightVisible, expectedDarkVisible}) => {
            // # Switch sync with OS off
            await ThemeSettingsScreen.scrollTop();
            await ThemeSettingsScreen.osSyncSwitch.tap();

            // # Set custom theme
            await Preference.apiSaveTheme(userId, teamId, themeToSave);

            // # Switch sync with OS on
            await ThemeSettingsScreen.osSyncSwitch.tap();

            // * Verify that active theme was properly categorized by color scheme
            await ThemeSettingsScreen.scrollBottom();
            await expect(expectedLightVisible).toBeVisible();
            await expect(expectedDarkVisible).toBeVisible();
        },
    );

    test('toggling OS sync not changes other teams themes', async () => {
        // # Add user to a new team
        const {team} = await Team.apiCreateTeam();
        await Team.apiAddUserToTeam(userId, team.id);

        // # Change current team theme
        await ThemeSettingsScreen.scrollTop();
        await ThemeSettingsScreen.osSyncSwitch.tap();
        await ThemeSettingsScreen.allThemesSapphire.tap();
        await expect(ThemeSettingsScreen.allThemesSapphireSelected).toBeVisible();

        // # Go to team sidebar and switch to already created team
        await ThemeSettingsScreen.back();
        await DisplaySettingsScreen.back();
        await GeneralSettingsScreen.close();
        await ChannelScreen.openTeamSidebar();
        await TeamsList.getTeamByDisplayName(team.display_name).tap();

        // # Open theme settings
        await ChannelScreen.openSettingsSidebar();
        await GeneralSettingsScreen.open();
        await DisplaySettingsScreen.open();
        await ThemeSettingsScreen.open();

        // * Verify that theme's settings of recently created team were not modified
        await ThemeSettingsScreen.scrollBottom();
        await expect(ThemeSettingsScreen.lightThemesDenimSelected).toBeVisible();
        await expect(ThemeSettingsScreen.darkThemesIndigoSelected).toBeVisible();
    });
});
