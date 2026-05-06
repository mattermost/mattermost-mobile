// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

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
import {timeouts, wait} from '@support/utils';
import {by, device, element, waitFor} from 'detox';

describe('Classification Banner - Visibility Across Screens', () => {
    const serverOneDisplayName = 'Server 1';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        // # Enable classification feature flag and set up classification with banner
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: true,
            },
        });
        await Properties.apiSetupClassificationWithBanner(siteOneUrl, {
            levelId: 'lvl-top-secret',
        });

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // # Wait for channel list to fully load and reload to ensure classification is applied
        await ChannelListScreen.toBeVisible();
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
    });

    afterAll(async () => {
        // # Clean up classification data and disable feature flag
        await Properties.apiCleanupClassification(siteOneUrl);
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ClassificationMarkings: false,
            },
        });

        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T_CB_SCREEN_1 - should display the classification banner on the Recent Mentions screen', async () => {
        // # Navigate to Recent Mentions tab
        await waitFor(element(by.id('tab_bar.mentions.tab'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.id('tab_bar.mentions.tab')).tap();
        await RecentMentionsScreen.toBeVisible();

        // * Verify banner is visible
        await GlobalClassificationBanner.toBeVisible();

        // # Return to channel list
        await element(by.id('tab_bar.home.tab')).tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T_CB_SCREEN_2 - should display the classification banner on the Saved Messages screen', async () => {
        // # Navigate to Saved Messages tab
        await waitFor(element(by.id('tab_bar.saved_messages.tab'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.id('tab_bar.saved_messages.tab')).tap();
        await SavedMessagesScreen.toBeVisible();

        // * Verify banner is visible
        await GlobalClassificationBanner.toBeVisible();

        // # Return to channel list
        await element(by.id('tab_bar.home.tab')).tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T_CB_SCREEN_3 - should display the classification banner on the Search screen', async () => {
        // # Navigate to Search tab
        await waitFor(element(by.id('tab_bar.search.tab'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.id('tab_bar.search.tab')).tap();
        await SearchMessagesScreen.toBeVisible();

        // * Verify banner is visible
        await GlobalClassificationBanner.toBeVisible();

        // # Return to channel list
        await element(by.id('tab_bar.home.tab')).tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T_CB_SCREEN_4 - should display the classification banner on the Account screen', async () => {
        // # Navigate to Account tab
        await waitFor(element(by.id('tab_bar.account.tab'))).toExist().withTimeout(timeouts.TEN_SEC);
        await element(by.id('tab_bar.account.tab')).tap();
        await AccountScreen.toBeVisible();

        // * Verify banner is visible
        await GlobalClassificationBanner.toBeVisible();

        // # Return to channel list
        await element(by.id('tab_bar.home.tab')).tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T_CB_SCREEN_5 - should display the classification banner on the Thread screen', async () => {
        // # Create a post and a reply via API to set up a thread
        const {post: rootPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: `Thread root ${Date.now()}`,
        });
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'Reply to thread',
            rootId: rootPost.id,
        });

        // # Reload so the thread is visible, then navigate into it
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', testChannel.name);
        await ChannelScreen.openReplyThreadFor(rootPost.id, rootPost.message);

        // * Verify banner is visible on the thread screen
        await ThreadScreen.toBeVisible();
        await GlobalClassificationBanner.toBeVisible();

        // # Navigate back to channel list
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
