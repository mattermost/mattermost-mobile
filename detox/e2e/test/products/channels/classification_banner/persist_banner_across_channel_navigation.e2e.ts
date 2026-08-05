// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {acquireClassificationLock, createClassificationLockOwner, releaseClassificationLock} from '@support/classification_lock';
import {enableClassificationMarkings} from '@support/classification_test_helper';
import {Properties, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {GlobalClassificationBanner} from '@support/ui/component';
import {ChannelListScreen, ChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

// Lock wait is up to 20m; leave headroom for enable/setup after acquire.
jest.setTimeout(timeouts.ONE_MIN * 30);

describe('Classification Banner - Global Classification Banner', () => {

    const serverOneDisplayName = 'Server 1';
    let lockOwner = '';
    let testUser: any;

    beforeAll(async () => {
        lockOwner = createClassificationLockOwner();
        await acquireClassificationLock(siteOneUrl, lockOwner);

        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });

        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        await Properties.apiCleanupClassification(siteOneUrl);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        try {
            await Properties.apiCleanupClassification(siteOneUrl);
            await System.apiPatchConfig(siteOneUrl, {
                FeatureFlags: {
                    ClassificationMarkings: false,
                },
            });

            await HomeScreen.logout();
        } finally {
            await releaseClassificationLock(siteOneUrl, lockOwner);
        }
    });

    afterEach(async () => {
        await Properties.apiCleanupClassification(siteOneUrl);
    });

    it('MM-T6201_1 - should persist the banner across channel navigation', async () => {
        await enableClassificationMarkings(siteOneUrl);
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', 'town-square');

        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();

        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();
        await expect(element(by.text('TOP SECRET'))).toBeVisible();
    });
});
