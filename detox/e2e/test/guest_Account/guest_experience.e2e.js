// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {ChannelScreen, CreateChannelScreen, SearchScreen, MoreDirectMessagesScreen} from '@support/ui/screen';
import {MainSidebar} from '@support/ui/component';
import {Channel, Setup, User, Team} from '@support/server_api';
import {timeouts, wait} from '@support/utils';

describe('Guest Experience', () => {
    let testChannel;
    let testUser;
    let testTeam;
    let users;
    beforeAll(async () => {
        const {team, user} = await Setup.apiInit();
        testUser = user;
        testTeam = team;
        await ChannelScreen.open(testUser);
        await User.apiDemoteToGuest(testUser.id);

        // Creating Private Channel
        ({channel: testChannel} = await Channel.apiCreateChannel({type: 'P', prefix: 'p-channel', teamId: testTeam.id}));
        await Channel.apiAddUserToChannel(testUser.id, testChannel.id);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T1404 Guest badge not shown next to system messages', async () => {
        // * Verify channel screen is visible
        await ChannelScreen.openMainSidebar();

        // # Open Mainside bar and press on private channels more button
        await MainSidebar.openCreatePrivateChannelButton.tap();

        // * Verify create channel screen is visible
        await CreateChannelScreen.toBeVisible();
        await expect(element(by.text('New Private Channel'))).toBeVisible();

        // # Fill the data and create a private channel
        await CreateChannelScreen.nameInput.typeText('Private');
        await CreateChannelScreen.createButton.tap();

        // Following methods are not working to verify Guest badge
        //await ChannelScreen.guestBadge().toBeVisible();
        //await ChannelScreen.guestBADGE();

        // * Verify if guest user has joined the channel
        await expect(element(by.text(`${testUser.username} joined the channel as guest.`))).toBeVisible();

        // * Verify GUEST badge not shown
        await expect(element(by.text('GUEST'))).toBeNotVisible();
    });

    it('MM-T1397 Guest tag in search in:', async () => {
        // Create guest User and adding to the Channel
        const {user: user2} = await User.apiCreateUser({prefix: 'TestUser'});
        users = user2;
        await User.apiDemoteToGuest(users.id);
        await Team.apiAddUserToTeam(users.id, testTeam.id);

        await Channel.apiAddUserToChannel(users.id, testChannel.id);

        await ChannelScreen.openMainSidebar();

        // # Open direct message screen
        await MoreDirectMessagesScreen.open();

        const {
            searchInput,

        } = MoreDirectMessagesScreen;

        // # Search TestUser
        await searchInput.typeText('TestUser');

        // # Wait for some profiles to load
        await wait(timeouts.ONE_SEC);

        const {
            getUserAtIndex,
            startButton,
        } = MoreDirectMessagesScreen;

        // # Select profile at 0 index
        await getUserAtIndex(0).tap();

        // # Create a GM with selected profiles
        await startButton.tap();

        // # Post a message
        await ChannelScreen.postMessage('message');
        await postMessageAndSearchIn();

        // TODO
        // Need to find a way to verify GUEST badge with user name in the list
        // * Verify GUEST badge is shown with username
        //await expect(element(by.text(`GUEST`))).toBeVisible();
    });
});
async function postMessageAndSearchIn() {
    const {
        searchInput,
    } = SearchScreen;

    // # Open search screen
    await SearchScreen.open();

    await searchInput.clearText();

    // # Type beginning of search term
    await searchInput.typeText('in:');
    await SearchScreen.cancel();
}
