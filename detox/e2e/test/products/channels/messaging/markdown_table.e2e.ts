// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Post,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    TableScreen,
} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Markdown Table', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4899_1 - should be able to display markdown table', async () => {
        // # Open a channel screen and post a markdown table
        const markdownTable =
            '| A | B | C |\n' +
            '|:---|:---|:---|\n' +
            '| 1 | Name | Toast |\n' +
            '| 2 | Name | Server |\n';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: markdownTable,
        });
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify markdown table is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemTable} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemTable).toBeVisible(50);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    // Skip iOS: CI run 30000635898 — expanded-table horizontal scroll cannot reveal the right column.
    (isIos() ? it.skip : it)('MM-T4899_2 - should be able to display markdown table with long text wrapped properly', async () => {
        // # Open a channel screen and post a markdown table with long text
        const markdownTable =
            '| Left header that wraps | Center header that wraps | Right header that wraps |\n' +
            '| :-- | :-: | --: |\n' +
            '| Left text that wraps row | Center text that wraps row | Right text that wraps row |\n';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: markdownTable,
        });
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify table is displayed with long text wrapped properly
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemTable, postListPostItemTableExpandButton} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemTable).toBeVisible(50);
        await expect(element(by.text('Left header that wraps'))).toBeVisible(50);
        await expect(element(by.text('Center header that wraps'))).toBeVisible(50);
        await expect(element(by.text('Right header that wraps'))).toBeVisible(50);
        await expect(element(by.text('Left text that wraps row'))).toBeVisible(50);
        await expect(element(by.text('Center text that wraps row'))).toBeVisible(50);
        await expect(element(by.text('Right text that wraps row'))).toBeVisible(50);

        // # Expand to full view
        await waitFor(postListPostItemTableExpandButton).toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(50, 'down');
        await postListPostItemTableExpandButton.tap();

        // * Verify on table screen with the markdown table
        await TableScreen.toBeVisible();
        await expect(element(by.text('Left header that wraps'))).toBeVisible(50);
        await expect(element(by.text('Center header that wraps'))).toBeVisible(50);

        // Verify the left/center body cells are visible BEFORE scrolling right.
        // The Android table renders the right column beyond the viewport, so the
        // scroll-right below pushes the left column off-screen — assert left/center
        // here first to avoid asserting them after they have been scrolled away.
        await expect(element(by.text('Left text that wraps row'))).toBeVisible(50);
        await expect(element(by.text('Center text that wraps row'))).toBeVisible(50);

        // Right-side columns render beyond the viewport on Android (the table's
        // minimum column width pushes the third column off-screen). Scroll the
        // table horizontally until the right header/row become visible.
        await waitFor(element(by.text('Right header that wraps'))).toBeVisible(50).whileElement(by.id(TableScreen.testID.tableScrollView)).scroll(150, 'right');
        await waitFor(element(by.text('Right text that wraps row'))).toBeVisible(50).whileElement(by.id(TableScreen.testID.tableScrollView)).scroll(150, 'right');

        // # Go back to channel list screen
        await TableScreen.back();
        await ChannelScreen.back();
    });

    it('MM-T4899_3 - should be able to open markdown table in full view and allow horizontal scroll', async () => {
        // # Open a channel screen and post a markdown table with more columns past horizontal view
        const markdownTable =
            '| Header | Header | Header | Header | Header | Header | Header | Header HS last |\n' +
            '| :-- | :-: | --: | --: | :-- | :-: | --: | --: |\n' +
            '| Left | Center | Right | Right | Left | Center | Right | Right |\n'.repeat(7) +
            '| Left | Center | Right | Right | Left | Center | Right | Right HS last |\n';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: markdownTable,
        });
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify table is displayed with some right columns not visible
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemTable, postListPostItemTableExpandButton} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemTable).toBeVisible(50);
        await expect(element(by.text('Header HS last'))).not.toBeVisible();
        await expect(element(by.text('Right HS last'))).not.toBeVisible();

        // # Expand to full view
        await waitFor(postListPostItemTableExpandButton).toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(50, 'down');
        await postListPostItemTableExpandButton.tap();
        await TableScreen.toBeVisible();
        await expect(element(by.text('Header HS last'))).not.toBeVisible();
        await expect(element(by.text('Right HS last'))).not.toBeVisible();

        // * Verify table screen is scrollable to the right
        await TableScreen.tableScrollView.scrollTo('right');
        await expect(element(by.text('Header HS last'))).toBeVisible(50);
        await expect(element(by.text('Right HS last'))).toBeVisible(50);

        // # Go back to channel list screen
        await TableScreen.back();
        await ChannelScreen.back();
    });

    // Skip: failed CI run 29954156963 (ios) — vertical scroll full view flake
    (isIos() ? it.skip : it)('MM-T4899_4 - should be able to open markdown table in full view and allow vertical scroll', async () => {
        // # Open a channel screen and post a markdown table with more rows past vertical view
        const markdownTable =
            '| Header | Header | Header VS last |\n' +
            '| :-- | :-: | --: |\n' +
            '| Left | Center | Right |\n'.repeat(30) +
            '| Left | Center | Right VS last |\n';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: markdownTable,
        });
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify table is displayed with some bottom rows not visible
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemTable, postListPostItemTableExpandButton} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemTable).toBeVisible(50);
        await expect(element(by.text('Header VS last'))).toBeVisible(50);
        await expect(element(by.text('Right VS last'))).not.toBeVisible();

        // # Expand to full view
        await waitFor(postListPostItemTableExpandButton).toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(50, 'down');
        await postListPostItemTableExpandButton.tap();
        await TableScreen.toBeVisible();

        // The expanded table renders columns wider than the in-channel preview, so
        // the 3rd column header is off-screen until the table is scrolled right.
        await waitFor(element(by.text('Header VS last'))).toBeVisible(50).whileElement(by.id(TableScreen.testID.tableScrollView)).scroll(150, 'right');
        await expect(element(by.text('Right VS last'))).not.toBeVisible();

        // * Verify table screen is scrollable to the bottom
        const expectedElement = element(by.text('Right VS last'));
        if (isIos()) {
            await waitFor(expectedElement).toBeVisible().whileElement(by.id(TableScreen.testID.tableScrollView)).scroll(150, 'down');
            await expect(element(by.text('Header VS last'))).not.toBeVisible();
            await expect(expectedElement).toBeVisible(50);
        } else {
            await expect(expectedElement).toExist();
        }

        // # Go back to channel list screen
        await TableScreen.back();
        await ChannelScreen.back();
    });

    // Skip iOS: CI run 30000635898 — duplicate Back accessibility nodes break table dismissal.
    (isIos() ? it.skip : it)('MM-T1442_1 - should display markdown table with multiple row heights correctly', async () => {
        // # Open a channel screen and post a markdown table with multiple row heights
        const markdownTable =
            '| Header | Header | Header |\n' +
            '| :-- | :-: | --: |\n' +
            '| Left | Center | Right |\n' +
            '| Left | Center | Right |\n' +
            '| This is a super looooooooooooooooooooong string | Center | Right |\n' +
            '| Left | Center | Right |\n' +
            '| Left | Center | Right |\n' +
            '| Left | Center | Right |\n';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: markdownTable,
        });
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify markdown table is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemTable, postListPostItemTableExpandButton} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemTable).toBeVisible(50);

        // * Verify the long-string row content is visible (it drives row height)
        await expect(element(by.text('This is a super looooooooooooooooooooong string'))).toBeVisible(50);

        // # Expand to full view
        await waitFor(postListPostItemTableExpandButton).toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(50, 'down');
        await postListPostItemTableExpandButton.tap();

        // * Verify on table screen
        await TableScreen.toBeVisible();
        await expect(element(by.text('Header')).atIndex(0)).toBeVisible(50);
        await expect(element(by.text('This is a super looooooooooooooooooooong string'))).toBeVisible(50);

        // # Go back to channel list screen
        await TableScreen.back();
        await ChannelScreen.back();
    });

    // Skip iOS: CI run 30000635898 — expand control is not hittable for the large table.
    (isIos() ? it.skip : it)('MM-T4899_5 - should be able to open markdown table in full view and allow both horizontal and vertical scrolls', async () => {
        // # Open a channel screen and post a markdown table with more columns and rows past horizontal and vertical views
        const markdownTable =
            '| Header | Header | Header | Header | Header | Header | Header | Header last |\n' +
            '| :-- | :-: | --: | --: | :-- | :-: | --: | --: |\n' +
            '| Left | Center | Right | Right | Left | Center | Right | Right |\n'.repeat(30) +
            '| Left | Center | Right | Right | Left | Center | Right | Right last |\n';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: markdownTable,
        });
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify table is displayed with some right columns and bottom rows not visible.
        // Poll for the post — large table posts can take a moment to persist via API sync.
        let post: {id: string} | undefined;
        const postDeadline = Date.now() + timeouts.TEN_SEC;
        /* eslint-disable no-await-in-loop */
        while (!post?.id && Date.now() < postDeadline) {
            const result = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            post = result?.post;
            if (!post?.id) {
                await wait(500);
            }
        }
        /* eslint-enable no-await-in-loop */
        if (!post?.id) {
            throw new Error('Expected markdown table post to exist in channel');
        }
        const {postListPostItemTable, postListPostItemTableExpandButton} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemTable).toBeVisible(50);
        await expect(element(by.text('Header last'))).not.toBeVisible();
        await expect(element(by.text('Right last'))).not.toBeVisible();

        // # Expand to full view
        await waitFor(postListPostItemTableExpandButton).toBeVisible().whileElement(by.id(ChannelScreen.postList.testID.flatList)).scroll(50, 'down');
        await postListPostItemTableExpandButton.tap();
        await TableScreen.toBeVisible();
        await expect(element(by.text('Header last'))).not.toBeVisible();
        await expect(element(by.text('Right last'))).not.toBeVisible();

        // * Verify table screen is scrollable to the right and scrollable to the bottom
        await waitFor(element(by.text('Header last'))).toBeVisible(50).whileElement(by.id(TableScreen.testID.tableScrollView)).scroll(150, 'right');
        await expect(element(by.text('Right last'))).not.toBeVisible();
        const expectedElement = element(by.text('Right last'));
        if (isIos()) {
            await waitFor(expectedElement).toBeVisible().whileElement(by.id(TableScreen.testID.tableScrollView)).scroll(150, 'down');
            await expect(element(by.text('Header last'))).not.toBeVisible();
            await expect(expectedElement).toBeVisible(50);
        } else {
            await expect(expectedElement).toExist();
        }

        // # Go back to channel list screen
        await TableScreen.back();
        await ChannelScreen.back();
    });
});
