// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup, User} from '@support/server_api';
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
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Localization', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Patch user locale to Spanish
        await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'es'});

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    it('MM-T303 - Text looks correct when viewed in a non-English language', async () => {
        // * Verify Home screen elements are in Spanish
        await expect(element(by.text('Hilos'))).toBeVisible();
        await expect(element(by.text('CANALES'))).toBeVisible();
        await expect(element(by.text('MENSAJES DIRECTOS'))).toBeVisible();
        await expect(element(by.text('Encontrar canales...'))).toBeVisible();

        // # Go to Account screen
        await AccountScreen.open();
        await wait(timeouts.TWO_SEC);

        // * Verify Account screen elements are in Spanish
        await expect(element(by.text('Establecer un estado personalizado'))).toBeVisible();
        await expect(element(by.text('Tu Perfil'))).toBeVisible();
        await expect(element(by.text('Ajustes'))).toBeVisible();
        await expect(element(by.text('Salir'))).toBeVisible();

        // # Go to Settings screen
        await AccountScreen.settingsOption.tap();

        // * Verify Settings screen title or elements
        await SettingsScreen.toBeVisible();

        // "Pantalla" instead of "Display"
        await expect(element(by.text('Pantalla'))).toBeVisible();

        // # Go to Display Settings
        await DisplaySettingsScreen.open();
        await DisplaySettingsScreen.toBeVisible();

        // * Verify Display Settings elements
        // "Tema" instead of "Theme"
        await expect(element(by.text('Tema'))).toBeVisible();

        // # Navigate back
        await DisplaySettingsScreen.back();
        await SettingsScreen.close();
    });

    it('MM-T304 - RN: No crash when setting language to zh-TW (Chinese Traditional)', async () => {
        // # Change language to zh-TW via API
        await User.apiPatchUser(siteOneUrl, testUser.id, {locale: 'zh-TW'});

        // # Wait for sync (simulating "Wait a few seconds for the RN app to sync")
        await wait(timeouts.FOUR_SEC);

        // * Verify app is still running and not crashed (check for Home screen visibility)
        await HomeScreen.channelListTab.tap();
        await HomeScreen.toBeVisible();

        // * Verify text update (optional, checking for "Channels" translation in Traditional Chinese)
        // "Channels" -> "頻道"
        await expect(element(by.text('頻道'))).toBeVisible();
    });
});
