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
    System,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    GlobalThreadsScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Threads - Follow and Unfollow Thread', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Enable Collapsed Reply Threads so the global threads UI surfaces
        // are rendered (ThreadsButton in the channel-list sidebar, follow
        // button in thread navigation, etc.). Without `always_on` the
        // `channel_list.threads.button` testID is conditionally removed
        // (see app/screens/home/channel_list/categories_list/categories_list.tsx
        // — `threadButtonComponent` returns null when `!isCRTEnabled`).
        await System.apiUpdateConfig(siteOneUrl, {
            ServiceSettings: {
                CollapsedThreads: 'always_on',
                ThreadAutoFollow: true,
            },
        });

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Navigate back from GlobalThreadsScreen if MM-T4806_4 left us there
        await GlobalThreadsScreen.back();

        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4806_2 - should be able to follow/unfollow a thread via post footer', async () => {
        // # Create a thread and go back to channel screen
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: parentPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(parentPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await ThreadScreen.postMessage(`${parentMessage} reply`);
        await ThreadScreen.back();

        // * Verify thread is followed by user by default via post footer
        // Use polling to wait for the post to be visible with its footer buttons
        const {postListPostItemFooterFollowButton, postListPostItemFooterFollowingButton} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        if (isAndroid()) {
            await wait(timeouts.TWO_SEC);
        }
        await waitForElementToBeVisible(postListPostItemFooterFollowingButton, timeouts.TEN_SEC);

        // # Unfollow thread via post footer
        await postListPostItemFooterFollowingButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is not followed by user via post footer
        await waitForElementToBeVisible(postListPostItemFooterFollowButton, timeouts.TEN_SEC);

        // # Follow thread via post footer
        await postListPostItemFooterFollowButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is followed by user via post footer
        await waitForElementToBeVisible(postListPostItemFooterFollowingButton, timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
