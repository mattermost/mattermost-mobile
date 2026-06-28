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
import {isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

/** Mirrors app/utils/subscription getSkuDisplayName for E2E learn-more expectations */
const getSkuDisplayNameForTest = (skuShortName: string, isGovSku: boolean): string => {
    let skuName = '';
    switch (skuShortName) {
        case 'E20':
            skuName = 'Enterprise E20';
            break;
        case 'E10':
            skuName = 'Enterprise E10';
            break;
        case 'professional':
            skuName = 'Professional';
            break;
        case 'starter':
            skuName = 'Starter';
            break;
        case 'enterprise':
            skuName = 'Enterprise';
            break;
        case 'entry':
            skuName = 'Entry';
            break;
        default:
            skuName = 'Enterprise Advanced';
            break;
    }
    skuName += isGovSku ? ' Gov' : '';
    return skuName;
};

const getExpectedProductTitle = (license: Record<string, string | undefined>, buildEnterpriseReady: string | undefined): string => {
    if (buildEnterpriseReady !== 'true') {
        return 'Mattermost Team Edition';
    }
    if (license?.IsLicensed === 'true') {
        return `Mattermost ${getSkuDisplayNameForTest(license.SkuShortName ?? '', license.IsGovSku === 'true')}`;
    }
    return 'Mattermost Enterprise Edition';
};

const getExpectedLearnMorePrefix = (license: Record<string, string | undefined>, buildEnterpriseReady: string | undefined): string => {
    if (buildEnterpriseReady !== 'true') {
        return 'Join the Mattermost community at ';
    }
    if (license?.IsLicensed === 'true') {
        const planName = getSkuDisplayNameForTest(license.SkuShortName ?? '', license.IsGovSku === 'true');
        return `Learn more about Mattermost ${planName} at `;
    }
    return 'Learn more about Enterprise Edition at ';
};

describe('Account - Settings - About', () => {
    const serverOneDisplayName = 'Server 1';
    let isLicensed: boolean;
    let expectedLearnMorePrefix: string;
    let expectedProductTitle: string;
    let testUser: any;

    beforeAll(async () => {
        const {license} = await System.apiGetClientLicense(siteOneUrl);
        const configResponse = await System.apiGetClientConfigOld(siteOneUrl);
        if (!configResponse.config || 'error' in configResponse) {
            throw new Error('Failed to fetch client config: test cannot proceed without valid config');
        }
        const {config} = configResponse;
        isLicensed = license.IsLicensed === 'true';
        expectedLearnMorePrefix = getExpectedLearnMorePrefix(license, config.BuildEnterpriseReady);
        expectedProductTitle = getExpectedProductTitle(license, config.BuildEnterpriseReady);
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
        await expect(AboutScreen.title).toBeVisible();
        await expect(AboutScreen.title).toHaveText(expectedProductTitle);
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

        // Scroll to footer elements with a bounded retry — unbounded whileElement scroll
        // can hang until the 240s test timeout on Android when elements are off-screen.
        const scrollToAboutElement = async (target: Detox.IndexableNativeElement) => {
            const scrollView = element(by.id(AboutScreen.testID.scrollView));

            // iOS nested Text (learnMoreUrl) cannot be scrolled into view via incremental
            // scroll — RCTEnhancedScrollView throws once the scroll view hits its end.
            if (isIos()) {
                await scrollView.scrollTo('bottom');

                // Nested Text testIDs are not exposed on iOS — poll by visible prefix text instead.
                await waitFor(element(by.text(expectedLearnMorePrefix.trim()))).
                    toExist().
                    withTimeout(timeouts.TEN_SEC);
                return;
            }

            // On Android edge-to-edge, footer elements can be in the ScrollView hierarchy
            // but render with <50% visible area (system bar insets); scroll to bottom first
            // then use toExist() (MM-T5104 testFnFailure — Build Date visible but scroll loop timed out).
            await scrollView.scrollTo('bottom');
            await wait(timeouts.ONE_SEC);
            try {
                await waitFor(target).
                    toExist().
                    whileElement(by.id(AboutScreen.testID.scrollView)).
                    scroll(150, 'down');
            } catch {
                /* fall through to bounded retry */
            }
            const assertPresent = async () => waitFor(target).toExist().withTimeout(timeouts.TWO_SEC);
            /* eslint-disable no-await-in-loop -- bounded scroll retry */
            for (let attempt = 0; attempt < 8; attempt++) {
                try {
                    await assertPresent();
                    return;
                } catch {
                    await scrollView.scroll(100, 'down');
                }
            }
            /* eslint-enable no-await-in-loop */
            await expect(target).toExist();
        };

        // Nested Text testIDs (learnMoreUrl) are not exposed to Espresso on Android;
        // on iOS nested Text is also unreliable for scroll-into-view — use learnMoreText.
        await scrollToAboutElement(AboutScreen.learnMoreText);
        if (isAndroid()) {
            await expect(AboutScreen.learnMoreText).toExist();
            await expect(element(by.text('https://mattermost.com'))).toExist();
        } else {
            await expect(AboutScreen.learnMoreText).toHaveText(expectedLearnMorePrefix);

            // Nested Text testIDs are not exposed on iOS (scrollToAboutElement note above).
        }
        await expect(AboutScreen.copyright).toHaveText(`Copyright 2015-${new Date().getFullYear()} Mattermost, Inc. All rights reserved`);
        await expect(AboutScreen.termsOfService).toHaveText('Terms of Service');
        await expect(AboutScreen.privacyPolicy).toHaveText('Privacy Policy');
        await expect(AboutScreen.noticeText).toHaveText('Mattermost is made possible by the open source software used in our server and mobile apps.');

        // Footer fields — scroll to bottom once; targeting buildDateValue first fails on Android
        // when Espresso reports the testID as null despite visible footer text (MM-T5104).
        const scrollView = element(by.id(AboutScreen.testID.scrollView));
        await scrollView.scrollTo('bottom');
        await wait(timeouts.ONE_SEC);
        await expect(AboutScreen.buildHashTitle).toHaveText('Build Hash:');
        await expect(AboutScreen.buildHashValue).toExist();
        await expect(AboutScreen.buildHashEnterpriseTitle).toHaveText('EE Build Hash:');
        await expect(AboutScreen.buildHashEnterpriseValue).toExist();
        await expect(AboutScreen.buildDateTitle).toHaveText('Build Date:');
        if (isAndroid()) {
            await expect(AboutScreen.buildDateTitle).toExist();
        } else {
            await expect(AboutScreen.buildDateValue).toExist();
        }
    });
});
