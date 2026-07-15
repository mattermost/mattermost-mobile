// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

// NOTE: These tests rely on `device.setURLBlacklist` to simulate offline behaviour.
// If network-blocking proves unreliable in CI (e.g., some requests still slip through),
// the assertion can be relaxed to a `toNotBeVisible` only if a cached value is NOT expected.
// MM-T_CB_OFFLINE_2 is the most sensitive because it expects the OLD cached value after the
// server changes while the app is offline.

import {Properties, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {GlobalClassificationBanner} from '@support/ui/component';
import {ChannelListScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

describe('Classification Banner - Offline / Cache Behaviour', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {ClassificationMarkings: true},
        });
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        await Properties.apiCleanupClassification(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        await Properties.apiCleanupClassification(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {ClassificationMarkings: false},
        });
        await HomeScreen.logout();
    });

    afterEach(async () => {
        await Properties.apiCleanupClassification(siteOneUrl);
        await device.setURLBlacklist([]);
    });

    it('MM-T_CB_OFFLINE_1 - should display the banner from DB cache when API is unreachable on reload', async () => {
        // # Configure classification and verify it works online first
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {levelName: 'TOP SECRET'});
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        // # Block all API calls to simulate offline
        await device.setURLBlacklist([`.*${siteOneUrl}.*`]);

        // # Reload the app (it should hydrate from DB cache, not from the API)
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Banner should still be visible from cached data
        await GlobalClassificationBanner.toBeVisible();
        await waitFor(element(by.text('TOP SECRET'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
    });

    it('MM-T_CB_OFFLINE_2 - should show stale cached value when API is blocked after a server change', async () => {
        // # Set up classification at TOP SECRET
        const {linkedFieldId, optionIdsByName} = await Properties.apiSetupClassificationWithBanner(siteOneUrl, {levelName: 'TOP SECRET'});
        const secretOptionId = optionIdsByName.SECRET;
        if (!secretOptionId) {
            throw new Error(`SECRET option id missing from setup. Available: ${Object.keys(optionIdsByName).join(', ')}`);
        }
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        // # Change classification value on the server to SECRET
        await Properties.apiPatchSystemPropertyValues(siteOneUrl, 'access_control', [
            {field_id: linkedFieldId, value: secretOptionId},
        ]);

        // # Block API calls and reload — app should load old cache (TOP SECRET, not SECRET)
        await device.setURLBlacklist([`.*${siteOneUrl}.*`]);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Stale cached value (TOP SECRET) should appear — the new value (SECRET) was never fetched
        await GlobalClassificationBanner.toBeVisible();
        await waitFor(element(by.text('TOP SECRET'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(element(by.text('SECRET'))).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);
    });

    it('MM-T_CB_OFFLINE_3 - should not display the banner when there is no cached data and the API is blocked', async () => {
        // # Reload while online so the app fetches the (now-empty) classification
        // data and persists it, clearing any stale cache from prior tests.
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // # Block API calls before reloading again
        await device.setURLBlacklist([`.*${siteOneUrl}.*`]);

        // # Reload the app with no cached data and no API access
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Banner must not appear and the app must not crash
        await GlobalClassificationBanner.toNotBeVisible();

        // # Unblock to allow cleanup
        await device.setURLBlacklist([]);
        await wait(timeouts.ONE_SEC);
    });
});
