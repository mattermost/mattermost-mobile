// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

// Split from recent_mentions.e2e.ts — empty-state checks need a user with
// ZERO mentions, which is incompatible with the populated-fixture used by
// the sibling spec. Each test here logs in as a fresh user.

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    RecentMentionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Search - Recent Mentions (empty state)', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3372 - should show empty state when there are no recent mentions', async () => {
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.toBeVisible();

        await expect(RecentMentionsScreen.emptyTitle).toBeVisible();
        await expect(RecentMentionsScreen.emptyTitle).toHaveText('No Mentions yet');
        await expect(RecentMentionsScreen.emptyParagraph).toBeVisible();
        await expect(RecentMentionsScreen.emptyParagraph).toHaveText('You\'ll see messages here when someone mentions you or uses terms you\'re monitoring.');

        await ChannelListScreen.open();
    });

    it('MM-T4909_1 - should match elements on recent mentions screen', async () => {
        await RecentMentionsScreen.open();

        await expect(RecentMentionsScreen.largeHeaderTitle).toHaveText('Recent Mentions');
        await expect(RecentMentionsScreen.largeHeaderSubtitle).toHaveText('Messages you\'ve been mentioned in');
        await expect(RecentMentionsScreen.emptyTitle).toHaveText('No Mentions yet');
        await expect(RecentMentionsScreen.emptyParagraph).toHaveText('You\'ll see messages here when someone mentions you or uses terms you\'re monitoring.');

        await ChannelListScreen.open();
    });
});
