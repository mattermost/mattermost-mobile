// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {enableClassificationMarkings} from '@support/classification_test_helper';
import {Post, Properties, Setup, System} from '@support/server_api';
import {canMutateServer, requireMutationServer} from '@support/server_role';
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
    TableScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

jest.setTimeout(timeouts.ONE_MIN * 30);

(isAndroid() ? describe.skip : describe)('Classification Banner - Visibility Across Screens', () => {
    const serverOneDisplayName = 'Server 1';
    let testChannel: any;
    let testUser: any;

    // Runs alone on the mutation server (detox/e2e/server_mutation_specs.json), so no lock is needed.
    beforeAll(async () => {
        requireMutationServer('classification_banner_across_screens');

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

    beforeEach(async () => {
        // Nothing else writes this server, so a flipped flag is a real bug, not something to re-enable.
        const {config: clientConfig} = await System.apiGetClientConfigOld(siteOneUrl);
        if (clientConfig?.FeatureFlagClassificationMarkings !== 'true') {
            throw new Error(`FeatureFlagClassificationMarkings flipped off mid-suite (client=${String(clientConfig?.FeatureFlagClassificationMarkings)})`);
        }
    });

    afterAll(async () => {
        if (!canMutateServer) {
            await HomeScreen.logout();
            return;
        }

        try {
            await Properties.apiCleanupClassification(siteOneUrl);
        } finally {
            await HomeScreen.logout();
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

    it('MM-T6214_1 - should display the classification banner on the expanded Table screen without covering its controls or content', async () => {
        // # Post a small markdown table
        const markdownTable =
            '| BannerColA | BannerColB |\n' +
            '| :-- | :-- |\n' +
            '| BannerCellOne | BannerCellTwo |\n';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: markdownTable,
        });

        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('channels', testChannel.name);

        // # Expand the table to full view
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemTable, postListPostItemTableExpandButton} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemTable).toBeVisible(50);
        await waitFor(postListPostItemTableExpandButton).toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(50, 'down');
        await postListPostItemTableExpandButton.tap();
        await TableScreen.toBeVisible();

        // * Verify the classification banner is visible on the Table screen
        await GlobalClassificationBanner.toBeVisible();

        // * Verify the banner does not cover the Table screen controls or content:
        // the back button and the table cells remain visible beneath it.
        await expect(TableScreen.backButton).toBeVisible();
        await expect(element(by.text('BannerColA'))).toBeVisible(50);
        await expect(element(by.text('BannerCellOne'))).toBeVisible(50);

        // # Go back to channel list screen
        await TableScreen.back();
        await ChannelScreen.back();
    });
});
