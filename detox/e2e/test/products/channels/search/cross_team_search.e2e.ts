// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Post,
    Setup,
    Team,
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
    PermalinkScreen,
    SearchMessagesScreen,
    ServerScreen,
    TeamDropdownMenuScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Search - Cross Team Search', () => {
    const serverOneDisplayName = 'Server 1';
    const searchTerm = 'Horses are fun';
    const channelsCategory = 'channels';
    let testUser: any;
    let teamOpen: any;
    let teamRainforest: any;
    let offTopicChannel: any;
    let townSquareChannel: any;
    let offTopicPost: any;
    let townSquarePost: any;

    beforeAll(async () => {
        // # Create first team (Rainforest) with user - this will be the team with Off-Topic
        const {team, user} = await Setup.apiInit(siteOneUrl, {teamOptions: {prefix: 'rainforest'}});
        teamRainforest = team;
        testUser = user;

        // # Get Off-Topic channel for Rainforest team
        const {channel: offTopicChannelResult} = await Channel.apiGetChannelByName(siteOneUrl, teamRainforest.id, 'off-topic');
        offTopicChannel = offTopicChannelResult;

        // # Create second team (Team Open) and add user to it
        const {team: testTeamOpen} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'team-open'});
        teamOpen = testTeamOpen;
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, teamOpen.id);

        // # Get Town Square channel for Team Open
        const {channel: townSquareChannelResult} = await Channel.apiGetChannelByName(siteOneUrl, teamOpen.id, 'town-square');
        townSquareChannel = townSquareChannelResult;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T5827 - should be able to search messages across multiple teams and navigate to results', async () => {
        // # a) Click on Off-Topic channel and dismiss tutorial if present
        await ChannelScreen.open(channelsCategory, offTopicChannel.name);

        // * a) Verify in Off-Topic channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.introDisplayName).toHaveText(offTopicChannel.display_name);

        // # Dismiss "Type a message" pop-up if present
        try {
            const tutorialX = element(by.text('X'));
            await tutorialX.tap();
            await wait(timeouts.ONE_SEC);
        } catch (e) {
            // Tutorial not present, continue
        }

        // # b) In the "Write to..." field, type "Horses are fun" then tap on the airplane icon
        await ChannelScreen.postMessage(searchTerm);

        // * b) Verify message posted in the channel
        const {post: offTopicPostResult} = await Post.apiGetLastPostInChannel(siteOneUrl, offTopicChannel.id);
        offTopicPost = offTopicPostResult;
        const {postListPostItem: offTopicPostItem} = ChannelScreen.getPostListPostItem(offTopicPost.id, searchTerm);
        await expect(offTopicPostItem).toBeVisible();

        // # c) Tap on the back arrow, top left of the screen
        await ChannelScreen.back();

        // * c) Verify back at the main screen showing the channels (in Rainforest team)
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(teamRainforest.display_name);

        // # d) Tap on Team Open from team sidebar (TE button on the left)
        await ChannelListScreen.getTeamItemNotSelected(teamOpen.id).tap();
        await wait(timeouts.ONE_SEC);

        // * d) Verify in Team Open
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(teamOpen.display_name);

        // # e) Tap on Town Square channel
        await ChannelScreen.open(channelsCategory, townSquareChannel.name);

        // * e) Verify in Town Square channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.introDisplayName).toHaveText(townSquareChannel.display_name);

        // # f) In the "Write to..." field, type "Horses are fun" then tap on the airplane icon
        await ChannelScreen.postMessage(searchTerm);

        // * f) Verify message posted in the channel
        const {post: townSquarePostResult} = await Post.apiGetLastPostInChannel(siteOneUrl, townSquareChannel.id);
        townSquarePost = townSquarePostResult;
        const {postListPostItem: townSquarePostItem} = ChannelScreen.getPostListPostItem(townSquarePost.id, searchTerm);
        await expect(townSquarePostItem).toBeVisible();

        // # g) Tap on the back arrow, top left
        await ChannelScreen.back();

        // * g) Verify back at the main screen showing the channels
        await ChannelListScreen.toBeVisible();

        // # h) Tap on the search icon, 2nd from the left in the white bar along the bottom of the screen
        await SearchMessagesScreen.open();

        // * h) Verify on the Search screen
        await SearchMessagesScreen.toBeVisible();
        await expect(SearchMessagesScreen.largeHeaderTitle).toHaveText('Search');

        // * i) Verify to the right of "Search Options" is "Team Open" with a drop-down arrow
        await expect(SearchMessagesScreen.searchModifierHeader).toHaveText('Search options');
        await expect(element(by.text(teamOpen.display_name))).toBeVisible();

        // # j) Tap on Team Open with the drop-down arrow, then select All teams
        await SearchMessagesScreen.teamPickerButton.tap();
        await wait(timeouts.ONE_SEC);
        await element(by.text('All teams')).tap();

        // * j) Verify the selector changed to All teams
        await expect(element(by.text('All teams'))).toBeVisible();

        // # k) In the "Search messages and files" field, type "horses" and press Enter
        await SearchMessagesScreen.searchInput.typeText('horses');
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * k) Verify search results contain messages from both teams
        const {postListPostItem: offTopicSearchResult} = SearchMessagesScreen.getPostListPostItem(offTopicPost.id, searchTerm);
        const {postListPostItem: townSquareSearchResult} = SearchMessagesScreen.getPostListPostItem(townSquarePost.id, searchTerm);
        await expect(offTopicSearchResult).toBeVisible();
        await expect(townSquareSearchResult).toBeVisible();

        // # l) Tap on the "All teams" with the drop-down arrow selector and select "Team Open"
        await SearchMessagesScreen.teamPickerButton.tap();
        await wait(timeouts.ONE_SEC);
        await TeamDropdownMenuScreen.getTeamIcon(teamOpen.id).tap();

        // * l) Verify search results update to show only the message from Team Open
        await expect(townSquareSearchResult).toBeVisible();
        await expect(offTopicSearchResult).not.toBeVisible();

        // # m) Clear the search input field
        await SearchMessagesScreen.searchClearButton.tap();

        // # m) Then tap on "Team Open" selector to the right of Search options
        await SearchMessagesScreen.teamPickerButton.tap();
        await wait(timeouts.ONE_SEC);

        // * m) Verify pop-up headed "Select a team to search"
        await expect(element(by.text('Select a team to search'))).toBeVisible();

        // # n) Tap on "All teams" option
        await element(by.text('All teams')).tap();

        // * n) Verify only two options visible - "exclude search terms" and "messages with phrases"
        await expect(SearchMessagesScreen.searchModifierExclude).toBeVisible();
        await expect(SearchMessagesScreen.searchModifierPhrases).toBeVisible();
        await expect(SearchMessagesScreen.searchModifierFrom).not.toBeVisible();
        await expect(SearchMessagesScreen.searchModifierIn).not.toBeVisible();

        // # o) Tap on "All teams" drop-down selector and select "Rainforest"
        await SearchMessagesScreen.teamPickerButton.tap();
        await wait(timeouts.ONE_SEC);
        await TeamDropdownMenuScreen.getTeamIcon(teamRainforest.id).tap();

        // * o) Verify search options now include "From:" and "In:" (4 options total)
        await expect(SearchMessagesScreen.searchModifierFrom).toBeVisible();
        await expect(SearchMessagesScreen.searchModifierIn).toBeVisible();
        await expect(SearchMessagesScreen.searchModifierExclude).toBeVisible();
        await expect(SearchMessagesScreen.searchModifierPhrases).toBeVisible();

        // # p) Tap on "From:" then insert testUser's at_mention_name and press Enter
        await SearchMessagesScreen.searchModifierFrom.tap();
        await SearchMessagesScreen.searchInput.typeText(`${testUser.username} horses`);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * p) Verify the message posted in Off-Topic channel in Rainforest team appears in search results
        await expect(offTopicSearchResult).toBeVisible();

        // # q) Tap on the message in the search results
        await offTopicSearchResult.tap();
        await wait(timeouts.TWO_SEC);

        // * q) Verify pop-up headed "Off-Topic" and a button saying "Jump to recent messages"
        await PermalinkScreen.toBeVisible();
        await expect(PermalinkScreen.jumpToRecentMessagesButton).toBeVisible();

        // # r) Tap on "Jump to recent messages"
        await PermalinkScreen.jumpToRecentMessages();
        await wait(timeouts.TWO_SEC);

        // * r) Verify in the Off-Topic channel and see the message posted earlier
        await ChannelScreen.toBeVisible();
        await expect(offTopicPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
