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

    it('MM-T4806_1 - should be able to follow/unfollow a thread via thread navigation', async () => {
        // # Create a thread
        const parentMessage = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(parentMessage);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        await ChannelScreen.openReplyThreadFor(parentPost.id, parentMessage);
        await ThreadScreen.postMessage(`${parentMessage} reply`);

        // * Verify thread is followed by user by default via thread navigation
        // Use polling to wait for the button to appear, avoiding bridge-idle sync stalls
        // on Android and iOS after post animations and DB writes.
        await waitForElementToBeVisible(ThreadScreen.followingButton, timeouts.TEN_SEC);

        // # Unfollow thread via thread navigation
        await ThreadScreen.followingButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is not followed by user via thread navigation
        await waitForElementToBeVisible(ThreadScreen.followButton, timeouts.TEN_SEC);

        // # Follow thread via thread navigation
        await ThreadScreen.followButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify thread is followed by user via thread navigation
        await waitForElementToBeVisible(ThreadScreen.followingButton, timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
