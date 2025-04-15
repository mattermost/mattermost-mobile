// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    Invite,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Teams - Invite', () => {
    const serverOneDisplayName = 'Server 1';

    let testTeam: any;
    let testUser: any;
    let testUser1: any;
    let testUser2: any;
    let testUser3: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;
        const {user: user1} = await User.apiCreateUser(siteOneUrl, {prefix: 'i'});
        testUser1 = user1;
        const {user: user2} = await User.apiCreateUser(siteOneUrl);
        testUser2 = user2;
        await Team.apiAddUserToTeam(siteOneUrl, testUser2.id, testTeam.id);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await device.reloadReactNative();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open invite screen
        await Invite.open();
    });

    afterAll(async () => {
        // # Close invite screen
        await Invite.close();

        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T5360 - should open the invite screen', async () => {
        // * Verify invite screen Header buttons
        await expect(Invite.closeButton).toBeVisible();
        await expect(Invite.sendButton).toBeVisible();

        // * Verify Team data
        await expect(Invite.teamDisplayName).toHaveText(testTeam.display_name);
        await expect(Invite.teamIcon).toBeVisible();

        // * Verify Server data
        await expect(Invite.serverDisplayName).toHaveText(serverOneDisplayName);

        // * Verify Share Link
        await expect(Invite.shareLinkButton).toBeVisible();

        // * Verify Search bar
        await expect(Invite.searchBarTitle).toBeVisible();
        await expect(Invite.searchBarInput).toBeVisible();
    });

    it('MM-T5361 - should show no results item in search list', async () => {
        const noUser = 'qwertyuiop';

        // # Search for a non-existent user
        await Invite.searchBarInput.replaceText(noUser);

        // * Validate no results item in search list
        await waitFor(Invite.getSearchListNoResults(noUser)).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(Invite.getSearchListNoResultsText(noUser)).toHaveText(noUser);
    });

    it('MM-T5362 - should be able to send email invite', async () => {
        const noUserEmailFormat = 'qwerty@ui.op';

        // # Search for a non-existent user with email format
        await Invite.searchBarInput.replaceText(noUserEmailFormat);

        // * Validate email invite item in search list
        await waitFor(Invite.getSearchListTextItem(noUserEmailFormat)).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(Invite.getSearchListTextItemText(noUserEmailFormat)).toHaveText(noUserEmailFormat);

        // # Select email invite item
        await Invite.getSearchListTextItem(noUserEmailFormat).tap();
        await expect(Invite.getSearchListTextItem(noUserEmailFormat)).not.toBeVisible();

        // * Validate email invite is added to selected items
        await expect(Invite.getSelectedItem(noUserEmailFormat)).toBeVisible();

        // # Send invitation
        await Invite.sendButton.tap();

        // * Validate summary report sent
        await waitFor(Invite.screenSummary).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(Invite.getSummaryReportSent()).toBeVisible();
        await expect(Invite.getSummaryReportNotSent()).not.toExist();
        await expect(Invite.getSummaryReportTextItem(noUserEmailFormat)).toBeVisible();
        await expect(Invite.getSummaryReportTextItemText(noUserEmailFormat)).toHaveText(noUserEmailFormat);
    });

    it('MM-T5363 - should be able to send user invite', async () => {
        // # Search for an existent user
        await Invite.searchBarInput.replaceText(testUser1.username);

        // * Validate user item in search list
        await waitFor(Invite.getSearchListUserItem(testUser1.id)).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(Invite.getSearchListUserItemText(testUser1.id)).toHaveText(testUser1.username);

        // # Select user item
        await Invite.getSearchListUserItem(testUser1.id).tap();
        await expect(Invite.getSearchListUserItem(testUser1.id)).not.toBeVisible();

        // * Validate user is added to selected items
        await expect(Invite.getSelectedChip()).toBeVisible();
        await expect(Invite.getSelectedChip()).toHaveText(testUser1.username);

        // # Send invitation
        await Invite.sendButton.tap();

        // * Validate summary report sent
        await waitFor(Invite.screenSummary).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(Invite.getSummaryReportSent()).toBeVisible();
        await expect(Invite.getSummaryReportNotSent()).not.toExist();
        await expect(Invite.getSummaryReportUserItem(testUser1.id)).toBeVisible();
        await expect(Invite.getSummaryReportUserItemText(testUser1.id)).toHaveText(testUser1.username);
    });

    it('MM-T5364 - should not be able to send user invite to user already in team', async () => {
        // # Search for an existent user already in team
        await Invite.searchBarInput.replaceText(testUser2.username);

        // * Validate user item in search list
        await waitFor(Invite.getSearchListUserItem(testUser2.id)).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Select user item
        await Invite.getSearchListUserItem(testUser2.id).tap();

        // * Validate user is added to selected items
        await expect(Invite.getSelectedChip()).toBeVisible();
        await expect(Invite.getSelectedChip()).toHaveText(testUser2.username);

        // # Send invitation
        await Invite.sendButton.tap();

        // * Validate summary report not sent
        await expect(Invite.screenSummary).toBeVisible();
        await expect(Invite.getSummaryReportSent()).not.toExist();
        await expect(Invite.getSummaryReportNotSent()).toBeVisible();
        await expect(Invite.getSummaryReportUserItem(testUser2.id)).toBeVisible();
        await expect(Invite.getSummaryReportUserItemText(testUser2.id)).toHaveText(testUser2.username);
    });

    it('MM-T5365 - should handle both sent and not sent invites', async () => {
        const {user: user3} = await User.apiCreateUser(siteOneUrl, {prefix: 'i'});
        testUser3 = user3;

        // # Search for an existent user
        await Invite.searchBarInput.replaceText(testUser3.username);

        // * Validate user item in search list
        await waitFor(Invite.getSearchListUserItem(testUser3.id)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Select user item
        await Invite.getSearchListUserItem(testUser3.id).tap();

        // * Validate user is added to selected items
        await expect(Invite.getSelectedChip()).toBeVisible();
        await expect(Invite.getSelectedChip()).toHaveText(testUser3.username);

        // # Search for a existent user already in team
        await Invite.searchBarInput.replaceText(testUser.username);

        // # Wait for user item in search list
        await waitFor(Invite.getSearchListUserItem(testUser.id)).toExist().withTimeout(timeouts.TWO_SEC);

        // # Select user item
        await Invite.getSearchListUserItem(testUser.id).tap();

        // # Send invitation
        await Invite.sendButton.tap();

        // * Validate summary
        waitFor(Invite.screenSummary).toBeVisible();

        // * Validate summary report not sent
        await expect(Invite.getSummaryReportNotSent()).toBeVisible();
        await expect(Invite.getSummaryReportUserItem(testUser.id)).toBeVisible();
        await expect(Invite.getSummaryReportUserItemText(testUser.id)).toBeVisible(testUser.username1);

        // * Validate summary report sent
        waitFor(Invite.getSummaryReportSent()).toBeVisible();
        await expect(Invite.getSummaryReportUserItem(testUser3.id)).toBeVisible();
        await expect(Invite.getSummaryReportUserItemText(testUser3.id)).toBeVisible(testUser3.username1);
    });
});
