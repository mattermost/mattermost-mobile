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
// MM-T6207 is the most sensitive because it expects the OLD cached value after the
// server changes while the app is offline.

import {acquireClassificationLock, createClassificationLockOwner, releaseClassificationLock} from '@support/classification_lock';
import {enableClassificationMarkings} from '@support/classification_test_helper';
import {Properties, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {GlobalClassificationBanner} from '@support/ui/component';
import {ChannelListScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, waitFor} from 'detox';

// Lock wait is up to 20m; leave headroom for enable/setup after acquire.
jest.setTimeout(timeouts.ONE_MIN * 30);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getBlockedServerPatterns = () => {
    const patterns = new Set<string>();
    for (const url of Array.from(new Set([siteOneUrl, serverOneUrl]))) {
        patterns.add(`.*${escapeRegex(url)}.*`);
        try {
            const parsed = new URL(url);
            patterns.add(`.*${escapeRegex(parsed.hostname)}.*`);
            patterns.add(`.*${escapeRegex(parsed.host)}.*`);

            // Cover scheme/port variants Detox may see from the native client.
            patterns.add(`.*${escapeRegex(parsed.hostname)}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}.*`);
        } catch {
            // Ignore unparsable SITE_/SERVER_ URLs — the raw URL pattern still applies.
        }
    }
    return Array.from(patterns);
};

describe('Classification Banner - Offline / Cache Behaviour', () => {
    const serverOneDisplayName = 'Server 1';
    let lockOwner = '';
    let testUser: any;

    beforeAll(async () => {
        lockOwner = createClassificationLockOwner();
        await acquireClassificationLock(siteOneUrl, lockOwner);

        await enableClassificationMarkings(siteOneUrl);
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        await Properties.apiCleanupClassification(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        try {
            // Each step runs even if an earlier one fails, so a cleanup error cannot leave
            // the feature flag enabled or the session logged in for later suites.
            try {
                await Properties.apiCleanupClassification(siteOneUrl);
            } finally {
                try {
                    await System.apiPatchConfig(siteOneUrl, {
                        FeatureFlags: {ClassificationMarkings: false},
                    });
                } finally {
                    await HomeScreen.logout();
                }
            }
        } finally {
            await releaseClassificationLock(siteOneUrl, lockOwner);
        }
    });

    afterEach(async () => {
        await Properties.apiCleanupClassification(siteOneUrl);
        await device.setURLBlacklist([]);
    });

    it('MM-T6206_1 - should display the banner from DB cache when API is unreachable on reload', async () => {
        // # Configure classification and verify it works online first
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });

        // Cold start picks up FeatureFlagClassificationMarkings + property fields
        // more reliably than reloadReactNative alone (CI 30250131265 iOS T6206
        // failed the online banner precondition before any blacklist).
        await device.launchApp({newInstance: true});
        await ChannelListScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();
        await waitFor(element(by.text('TOP SECRET'))).toBeVisible().withTimeout(timeouts.HALF_MIN);

        // # Block all API calls to simulate offline
        await device.setURLBlacklist(getBlockedServerPatterns());

        // # Reload the app (it should hydrate from DB cache, not from the API)
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Banner should still be visible from cached data
        await GlobalClassificationBanner.toBeVisible();
        await waitFor(element(by.text('TOP SECRET'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
    });

    // CI 59ec6ae (iOS+Android): Detox setURLBlacklist does not reliably block WS;
    // SECRET can land in cache so TOP SECRET stale assert is not trustworthy.
    // Re-enable when offline simulation covers WebSocket or server API supports it.
    it.skip('MM-T6207_1 - should show stale cached value when API is blocked after a server change', async () => {
        // # Set up classification at TOP SECRET
        const {linkedFieldId, optionIdsByName} = await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        const secretOptionId = optionIdsByName.SECRET;
        if (!secretOptionId) {
            throw new Error(`SECRET option id missing from setup. Available: ${Object.keys(optionIdsByName).join(', ')}`);
        }
        await device.launchApp({newInstance: true});
        await ChannelListScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();
        await waitFor(element(by.text('TOP SECRET'))).toBeVisible().withTimeout(timeouts.HALF_MIN);

        // # Block API calls BEFORE changing the server value. Patching while online
        // lets WebSocket write SECRET into the local DB (CI 30250131265 Android
        // MM-T6207_1 screenshot showed SECRET — fresh cache, not a stale miss).
        await device.setURLBlacklist(getBlockedServerPatterns());

        // # Change classification value on the server to SECRET (test host → API;
        // the app must not observe this while blacklisted).
        await Properties.apiPatchSystemPropertyValues(siteOneUrl, 'access_control', [
            {field_id: linkedFieldId, value: secretOptionId},
        ]);

        // # Reload — app should load old cache (TOP SECRET, not SECRET)
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Stale cached value (TOP SECRET) should appear — the new value (SECRET) was never fetched
        await GlobalClassificationBanner.toBeVisible();
        await waitFor(element(by.text('TOP SECRET'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(element(by.text('SECRET'))).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);
    });

    it('MM-T6208_1 - should not display the banner when there is no cached data and the API is blocked', async () => {
        // # Reload while online so the app fetches the (now-empty) classification
        // data and persists it, clearing any stale cache from prior tests.
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // # Block API calls before reloading again
        await device.setURLBlacklist(getBlockedServerPatterns());

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
