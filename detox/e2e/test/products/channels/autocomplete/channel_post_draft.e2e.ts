// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Autocomplete} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Autocomplete - Channel Post Draft', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: {name: string};

    beforeAll(async () => {
        // Force a clean app process. Without this, when a prior spec in the
        // same shard leaves the app in a wedged state (observed: at-mention
        // / channel-mention specs running just before this one, sometimes
        // with a failed logout that left tab_bar.account.tab unreachable),
        // the next `ServerScreen.connectToServer` here hangs for the full
        // 360s hook timeout with `Detox can't seem to connect to the test app(s)!`
        // (run 26368981355, iOS shard 4 — all 8 tests in this spec failed
        // at line 34 column 28 with the same disconnect error).
        //
        // launchApp({newInstance: true}) starts a fresh process; matches the
        // existing pattern in message_draft.e2e.ts and ipad_post_message.e2e.ts.
        await device.launchApp({newInstance: true});

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Clear post input
        await ChannelScreen.postInput.clearText();

        // * Verify autocomplete is not displayed
        await Autocomplete.toBeVisible(false);
    });

    afterEach(async () => {
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4882_1 - should render at-mention autocomplete in post input', async () => {
        // * Verify at-mention list is not displayed
        await expect(Autocomplete.sectionAtMentionList).not.toExist();

        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();
    });

    it('MM-T4882_2 - should render channel mention autocomplete in post input', async () => {
        // * Verify channel mention list is not displayed
        await expect(Autocomplete.sectionChannelMentionList).not.toExist();

        // # Type in "~" to activate channel mention autocomplete
        await ChannelScreen.postInput.typeText('~');

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();
    });

    it('MM-T4882_3 - should render emoji suggestion autocomplete in post input', async () => {
        // * Verify emoji suggestion list is not displayed
        await expect(Autocomplete.flatEmojiSuggestionList).not.toExist();

        // # Type in ":" followed by 2 characters to activate emoji suggestion autocomplete
        await ChannelScreen.postInput.typeText(':sm');

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toExist();
    });

    it('MM-T4882_4 - should render slash suggestion autocomplete in post input', async () => {
        // * Verify slash suggestion list is not displayed
        await expect(Autocomplete.flatSlashSuggestionList).not.toExist();

        // # Type in "/" to activate slash suggestion autocomplete
        await ChannelScreen.postInput.typeText('/');
        await wait(timeouts.ONE_SEC);

        // * Verify slash suggestion list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toExist();
    });

    // MM-T3392_1-4 cover the same autocomplete behaviors as MM-T4882_1-4 but are tracked
    // under a separate Zephyr/Jira test cycle for historical regression coverage.
    it('MM-T3392_1 - should render emoji suggestion component when typing : in post input', async () => {
        // * Verify emoji suggestion list is not displayed
        await expect(Autocomplete.flatEmojiSuggestionList).not.toExist();

        // # Type ":" in post input to activate emoji suggestion autocomplete
        await ChannelScreen.postInput.typeText(':sm');

        // * Verify emoji suggestion autocomplete list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toExist();
    });

    it('MM-T3392_2 - should render at-mention component when typing @ in post input', async () => {
        // * Verify at-mention list is not displayed
        await expect(Autocomplete.sectionAtMentionList).not.toExist();

        // # Type "@" in post input to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');

        // * Verify at-mention autocomplete list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();
    });

    it('MM-T3392_3 - should render channel mention component when typing ~ in post input', async () => {
        // * Verify channel mention list is not displayed
        await expect(Autocomplete.sectionChannelMentionList).not.toExist();

        // # Type "~" in post input to activate channel mention autocomplete
        await ChannelScreen.postInput.typeText('~');

        // * Verify channel mention autocomplete list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();
    });

    it('MM-T3392_4 - should render slash suggestion component when typing / in post input', async () => {
        // * Verify slash suggestion list is not displayed
        await expect(Autocomplete.flatSlashSuggestionList).not.toExist();

        // # Type "/" in post input to activate slash suggestion autocomplete
        await ChannelScreen.postInput.typeText('/');
        await wait(timeouts.ONE_SEC);

        // * Verify slash suggestion autocomplete list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toExist();
    });
});
