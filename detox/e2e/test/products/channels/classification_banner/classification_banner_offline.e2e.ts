// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {enableClassificationMarkings} from '@support/classification_test_helper';
import {Properties, Setup} from '@support/server_api';
import {canMutateServer, requireMutationServer} from '@support/server_role';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {GlobalClassificationBanner} from '@support/ui/component';
import {ChannelListScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, waitFor} from 'detox';

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
    let testUser: any;

    // Runs alone on the mutation server (detox/e2e/server_mutation_specs.json), so no lock is needed.
    beforeAll(async () => {
        requireMutationServer('classification_banner_offline');

        await enableClassificationMarkings(siteOneUrl);
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        await Properties.apiCleanupClassification(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        if (!canMutateServer) {
            await HomeScreen.logout();
            return;
        }

        // Logout runs even if cleanup fails. ClassificationMarkings stays on, as the baseline expects.
        try {
            await Properties.apiCleanupClassification(siteOneUrl);
        } finally {
            await HomeScreen.logout();
        }
    });

    afterEach(async () => {
        try {
            await Properties.apiCleanupClassification(siteOneUrl);
        } finally {
            await device.setURLBlacklist([]);
        }
    });

    it('MM-T6206_1 - should display the banner from DB cache when API is unreachable on reload', async () => {
        // # Configure classification and verify it works online first
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });

        // Cold start picks up FeatureFlagClassificationMarkings and the property fields more
        // reliably than reloadReactNative alone.
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
