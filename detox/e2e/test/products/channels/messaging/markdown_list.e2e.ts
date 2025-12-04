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
} from '@support/ui/screen';
import {isAndroid, isIos} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Markdown List', () => {
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

    it('MM-T4894_1 - should be able to display markdown bullet list', async () => {
        // # Open a channel screen and post a markdown bullet list
        const item1 = 'item one';
        const item2 = 'item two';
        const item2SubPoint = 'item two sub-point';
        const markdownBulletList = `* ${item1}\n- ${item2}\n  + ${item2SubPoint}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(markdownBulletList);

        // * Verify markdown bullet list is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemListItem, postListPostItemListItemBullet} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemListItem.atIndex(0)).toBeVisible();
        await expect(element(by.text(item1))).toBeVisible();
        await expect(element(by.text(item2))).toBeVisible();
        await expect(element(by.text(item2SubPoint))).toBeVisible();

        if (isAndroid()) {
            await expect(postListPostItemListItem.atIndex(0)).toHaveLabel(`• ${item1}`);
        }

        if (isIos()) {
            await expect(postListPostItemListItem.atIndex(0)).toBeVisible();
            await expect(postListPostItemListItem.atIndex(1)).toBeVisible();
            await expect(postListPostItemListItem.atIndex(2)).toBeVisible();

            await expect(postListPostItemListItemBullet.atIndex(0)).toHaveText('•');
            await expect(postListPostItemListItemBullet.atIndex(1)).toHaveText('•');
            await expect(postListPostItemListItemBullet.atIndex(2)).toHaveText('◦');
        }

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4894_2 - should be able to display markdown ordered list', async () => {
        // # Open a channel screen and post a markdown ordered list
        const item1 = 'Item one';
        const item2 = 'Item two';
        const item3 = 'Item three';
        const markdownOrderedList = `1. ${item1}\n1. ${item2}\n1. ${item3}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(markdownOrderedList);

        // * Verify markdown ordered list is displayed
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemListItem, postListPostItemListItemBullet} = ChannelScreen.getPostListPostItem(post.id);
        await expect(postListPostItemListItem.atIndex(0)).toBeVisible();
        await expect(postListPostItemListItemBullet.atIndex(0)).toHaveText('1.');
        await expect(element(by.text(item1))).toBeVisible();
        await expect(element(by.text(item2))).toBeVisible();
        await expect(element(by.text(item3))).toBeVisible();

        if (isAndroid()) {
            await expect(postListPostItemListItem.atIndex(0)).toHaveLabel(`1. ${item1}`);
        }

        if (isIos()) {
            await expect(postListPostItemListItem.atIndex(1)).toBeVisible();
            await expect(postListPostItemListItemBullet.atIndex(1)).toHaveText('2.');
            await expect(postListPostItemListItem.atIndex(2)).toBeVisible();
            await expect(postListPostItemListItemBullet.atIndex(2)).toHaveText('3.');
        }

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
