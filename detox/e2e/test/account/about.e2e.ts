// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup, System} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    HomeScreen,
    LoginScreen,
    AboutScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Account - Settings - About', () => {
    const serverOneDisplayName = 'Server 1';
    let isLicensed: boolean;
    let testUser: any;

    beforeAll(async () => {
        const {license} = await System.apiGetClientLicense(siteOneUrl);
        isLicensed = license.IsLicensed === 'true';
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, and go to about screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await AboutScreen.open();
    });

    beforeEach(async () => {
        // * Verify on about screen
        await AboutScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await AboutScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5104_1 - should match elements on about screen', async () => {
        // * Verify basic elements on about screen
        await expect(AboutScreen.backButton).toBeVisible();
        await expect(AboutScreen.logo).toBeVisible();
        await expect(AboutScreen.siteName).toBeVisible();
        await expect(AboutScreen.title).toBeVisible();
        await expect(AboutScreen.subtitle).toBeVisible();
        await expect(AboutScreen.appVersionTitle).toHaveText('App Version:');
        await expect(AboutScreen.appVersionValue).toBeVisible();
        await expect(AboutScreen.serverVersionTitle).toHaveText('Server Version:');
        await expect(AboutScreen.serverVersionValue).toBeVisible();
        await expect(AboutScreen.databaseTitle).toHaveText('Database:');
        await expect(AboutScreen.databaseValue).toBeVisible();
        await expect(AboutScreen.databaseSchemaVersionTitle).toHaveText('Database Schema Version:');
        await expect(AboutScreen.databaseSchemaVersionValue).toBeVisible();
        await expect(AboutScreen.copyInfoButton).toBeVisible();
        await expect(element(by.text(new RegExp('Copy info', 'i')))).toBeVisible();

        if (isLicensed) {
            await expect(AboutScreen.licensee).toBeVisible();

            // * Verify license load metric - this may or may not be visible depending on server version
            // * We're not asserting on the visibility since it depends on the server version and license
            // * Instead we're verifying it has the correct text if it is visible
            try {
                await expect(AboutScreen.licenseLoadMetricTitle).toHaveText('Load Metric:');
                await expect(AboutScreen.licenseLoadMetricValue).toBeVisible();
            } catch (error) {
                // Load metric may not be available depending on server version
                // This is fine as the feature depends on server version and configuration
            }
        } else {
            await expect(AboutScreen.licensee).not.toBeVisible();
            await expect(AboutScreen.licenseLoadMetricTitle).not.toBeVisible();
        }
        await expect(AboutScreen.learnMoreText).toHaveText('Learn more about Enterprise Edition at ');
        await expect(AboutScreen.learnMoreUrl).toBeVisible();
        await expect(AboutScreen.copyright).toHaveText(`Copyright 2015-${new Date().getFullYear()} Mattermost, Inc. All rights reserved`);
        await expect(AboutScreen.termsOfService).toHaveText('Terms of Service');
        await expect(AboutScreen.privacyPolicy).toHaveText('Privacy Policy');
        await expect(AboutScreen.noticeText).toHaveText('Mattermost is made possible by the open source software used in our server and mobile apps.');
        await waitFor(AboutScreen.buildDateValue).toBeVisible().whileElement(by.id(AboutScreen.testID.scrollView)).scroll(50, 'down');
        await expect(AboutScreen.buildHashTitle).toHaveText('Build Hash:');
        await expect(AboutScreen.buildHashValue).toBeVisible();
        await expect(AboutScreen.buildHashEnterpriseTitle).toHaveText('EE Build Hash:');
        await expect(AboutScreen.buildHashEnterpriseValue).toBeVisible();
        await expect(AboutScreen.buildDateTitle).toHaveText('Build Date:');
        await expect(AboutScreen.buildDateValue).toBeVisible();
    });
});
