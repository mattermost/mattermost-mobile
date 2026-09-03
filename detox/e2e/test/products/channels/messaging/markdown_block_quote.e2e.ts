// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
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
import {isAndroid, timeouts, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Markdown Block Quote', () => {
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

    it('MM-T4898_1 - should be able to display markdown block quote', async () => {
        // # Open a channel screen and post a markdown block quote
        const message = 'this is a quote that i am making long so it wraps on mobile this is a quote that i am making long so it wraps on mobile this is a quote that i am making long so it wraps on mobile this is a quote that i am making long so it wraps on mobile';
        const markdownBlockQuote = `>${message}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {post} = await ChannelScreen.postMessageAndVerify(markdownBlockQuote, testChannel.id, siteOneUrl);

        // * Verify markdown block quote is displayed.
        // waitForElementToBeVisible polls without requiring bridge idle; the Android markdown
        // render keeps the bridge busy, so expect().toBeVisible() hits the synchronization timeout.
        const {postListPostItemBlockQuote} = ChannelScreen.getPostListPostItem(post.id, message);

        await waitForElementToBeVisible(postListPostItemBlockQuote, isAndroid() ? timeouts.HALF_MIN : timeouts.TEN_SEC);
        await expect(element(by.text(message))).toBeVisible(50);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
