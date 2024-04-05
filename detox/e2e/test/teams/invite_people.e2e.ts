// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup, User} from '@support/server_api';
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
import {isIos, timeouts} from '@support/utils';
import {expect} from 'detox';

function systemDialog(label: string) {
    if (isIos()) {
        return element(by.label(label)).atIndex(0);
    }
    return element(by.text(label));
}

describe('Teams - Invite', () => {
    const serverOneDisplayName = 'Server 1';

    let testTeam: any;
    let testUser: any;
    let testUser1: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);

        testTeam = team;
        testUser = user;

        const {user: user1} = await User.apiCreateUser(siteOneUrl, {prefix: 'i'});

        testUser1 = user1;

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

        // * Verify default Selection
        await waitFor(Invite.screenSelection).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // * Verify Server data
        await expect(Invite.serverDisplayName).toHaveText(serverOneDisplayName);

        // * Verify Share Link
        await expect(Invite.shareLinkButton).toBeVisible();

        // * Verify Search bar
        await expect(Invite.searchBarTitle).toBeVisible();
        await expect(Invite.searchBarInput).toBeVisible();
    });

    it('MM-T5221 - should be able to share a URL invite to the team', async () => {
        if (isIos()) {
            // # Tap on Share link
            await Invite.shareLinkButton.tap();
            const dialog = systemDialog(`Join the ${testTeam.display_name} team`);

            // * Verify share dialog is open
            await expect(dialog).toExist();

            // # Close share dialog
            await dialog.swipe('down');
        } // no support for Android system dialogs by detox yet. See https://github.com/wix/Detox/issues/3227
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
        const username = ` @${testUser1.username}`;

        // # Search for an existent user
        await Invite.searchBarInput.replaceText(testUser1.username);

        // * Validate user item in search list
        await waitFor(Invite.getSearchListUserItem(testUser1.id)).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(Invite.getSearchListUserItemText(testUser1.id)).toHaveText(username);

        // # Select user item
        await Invite.getSearchListUserItem(testUser1.id).tap();
        await expect(Invite.getSearchListUserItem(testUser1.id)).not.toBeVisible();

        // * Validate user is added to selected items
        await expect(Invite.getSelectedItem(testUser1.id)).toBeVisible();

        // # Send invitation
        await Invite.sendButton.tap();

        // * Validate summary report sent
        await waitFor(Invite.screenSummary).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(Invite.getSummaryReportSent()).toBeVisible();
        await expect(Invite.getSummaryReportNotSent()).not.toExist();
        await expect(Invite.getSummaryReportUserItem(testUser1.id)).toBeVisible();
        await expect(Invite.getSummaryReportUserItemText(testUser1.id)).toHaveText(username);
    });

    it('MM-T5364 - should not be able to send user invite to user already in team', async () => {
        const username = ` @${testUser1.username}`;

        // # Search for an existent user already in team
        await Invite.searchBarInput.replaceText(testUser1.username);

        // * Validate user item in search list
        await waitFor(Invite.getSearchListUserItem(testUser1.id)).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Select user item
        await Invite.getSearchListUserItem(testUser1.id).tap();

        // * Validate user is added to selected items
        await expect(Invite.getSelectedItem(testUser1.id)).toBeVisible();

        // # Send invitation
        await Invite.sendButton.tap();

        // * Validate summary report not sent
        await expect(Invite.screenSummary).toBeVisible();
        await expect(Invite.getSummaryReportSent()).not.toExist();
        await expect(Invite.getSummaryReportNotSent()).toBeVisible();
        await expect(Invite.getSummaryReportUserItem(testUser1.id)).toBeVisible();
        await expect(Invite.getSummaryReportUserItemText(testUser1.id)).toHaveText(username);
    });

    it('MM-T5365 - should handle both sent and not sent invites', async () => {
        const {user: testUser2} = await User.apiCreateUser(siteOneUrl, {prefix: 'i'});

        // # Search for an existent user
        await Invite.searchBarInput.replaceText(testUser2.username);

        // * Validate user item in search list
        await waitFor(Invite.getSearchListUserItem(testUser2.id)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Select user item
        await Invite.getSearchListUserItem(testUser2.id).tap();

        // * Validate user is added to selected items
        await expect(Invite.getSelectedItem(testUser2.id)).toBeVisible();

        // # Search for a existent user already in team
        await Invite.searchBarInput.replaceText(testUser.username);

        // # Wait for user item in search list
        await waitFor(Invite.getSearchListUserItem(testUser.id)).toExist().withTimeout(timeouts.TWO_SEC);

        // # Select user item
        await Invite.getSearchListUserItem(testUser.id).tap();

        // * Validate user is added to selected items
        await expect(Invite.getSelectedItem(testUser.id)).toBeVisible();

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
        await expect(Invite.getSummaryReportUserItem(testUser2.id)).toBeVisible();
        await expect(Invite.getSummaryReportUserItemText(testUser2.id)).toBeVisible(testUser2.username1);
    });
});
