// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {acquireClassificationLock, createClassificationLockOwner, releaseClassificationLock} from '@support/classification_lock';
import {enableClassificationMarkings} from '@support/classification_test_helper';
import {Post, Properties, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {GlobalClassificationBanner} from '@support/ui/component';
import {
    AccountScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    RecentMentionsScreen,
    SavedMessagesScreen,
    SearchMessagesScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {by, device, element, waitFor} from 'detox';

// Lock wait is up to 20m; leave headroom for enable/setup after acquire.
jest.setTimeout(timeouts.ONE_MIN * 30);

// Skip Android (SEC-11047): CI run 30447839548 — suite flaking on Detox Android
// (MM-T6209_1 … MM-T6213_1). Trigger unknown. The observe()/observeSavedPostsByIds
// theory is RULED OUT by the runbook's comparison table (the suite passed both with
// and without those app changes, and failed on only one of three runs with identical
// app code — same code, opposite outcomes). The UI flow only navigates and asserts a
// banner; the suite still sets up classification via API
// (Properties.apiSetupClassificationWithBanner) and MM-T6213_1 creates posts, so this
// does not by itself rule out a product cause. The
// 20-min classification lock / 30-min Jest timeout makes lock contention or a slow
// acquire a plausible mechanism to rule in/out. Local repro blocked (no API-35
// emulator + ephemeral server torn down). Next step: diff the Android env (emulator
// state, ordering, what specs ran before this shard) between passing 30437339535 and
// failing 30447839548, and check lock-acquire timing. Owner stays QA unless that
// points to product. Kept describe.skip on Android (rule 6).
(isAndroid() ? describe.skip : describe)('Classification Banner - Visibility Across Screens', () => {
    const serverOneDisplayName = 'Server 1';
    let lockOwner = '';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        lockOwner = createClassificationLockOwner();
        await acquireClassificationLock(siteOneUrl, lockOwner);

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await enableClassificationMarkings(siteOneUrl);
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvltopsecret00000000000000',
            user: testUser,
        });

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        await ChannelListScreen.toBeVisible();
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
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
                        FeatureFlags: {
                            ClassificationMarkings: false,
                        },
                    });
                } finally {
                    await HomeScreen.logout();
                }
            }
        } finally {
            await releaseClassificationLock(siteOneUrl, lockOwner);
        }
    });

    it('MM-T6209_1 - should display the classification banner on the Recent Mentions screen', async () => {
        await waitFor(element(by.id('tab_bar.mentions.tab'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.id('tab_bar.mentions.tab')).tap();
        await RecentMentionsScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();

        await element(by.id('tab_bar.home.tab')).tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T6210_1 - should display the classification banner on the Saved Messages screen', async () => {
        await waitFor(element(by.id('tab_bar.saved_messages.tab'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.id('tab_bar.saved_messages.tab')).tap();
        await SavedMessagesScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();

        await element(by.id('tab_bar.home.tab')).tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T6211_1 - should display the classification banner on the Search screen', async () => {
        await waitFor(element(by.id('tab_bar.search.tab'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.id('tab_bar.search.tab')).tap();
        await SearchMessagesScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();

        await element(by.id('tab_bar.home.tab')).tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T6212_1 - should display the classification banner on the Account screen', async () => {
        await waitFor(element(by.id('tab_bar.account.tab'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.id('tab_bar.account.tab')).tap();
        await AccountScreen.toBeVisible();

        await GlobalClassificationBanner.toBeVisible();

        await element(by.id('tab_bar.home.tab')).tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T6213_1 - should display the classification banner on the Thread screen', async () => {
        const {post: rootPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: `Thread root ${Date.now()}`,
        });
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'Reply to thread',
            rootId: rootPost.id,
        });

        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', testChannel.name);
        await ChannelScreen.openReplyThreadFor(rootPost.id, rootPost.message);

        await ThreadScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();

        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
