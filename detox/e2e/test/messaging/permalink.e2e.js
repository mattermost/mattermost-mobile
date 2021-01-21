// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {ChannelScreen, CreateChannelScreen, PermalinkScreen} from '@support/ui/screen';
import {Channel, Post, Setup} from '@support/server_api';
import {adminUsername, adminPassword, serverUrl} from '@support/test_config';
import {getRandomId, isAndroid} from '@support/utils';


describe('Messaging', () => {
    let testTeam;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit({});
        testTeam = team;

        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    // - Create two private channels
    // - Post first channel url link in the public channel
    // - Post a message in second channel and post the permalink of it in the public channel
    // - Confirm the prompt and join the channel
    it('MM-30237 System admins prompted before joining private channel via permalink', async () => {
        const {
            logout,
            openTeamSidebar,
            postMessage,
        } = ChannelScreen;
        const {getTeamByDisplayName} = MainSidebar;

        // # Create Private Channel 1
        const privateChannel1Name = 'pc' + getRandomId();
        await createPrivateChannel(privateChannel1Name);

        // # Create Private Channel 2
        const privateChannel2Name = 'pc' + getRandomId();
        await createPrivateChannel(privateChannel2Name);

        // # Post a message in private channel 2
        await postMessage(Date.now().toString());

        // # Get the last post data
        const {channel: privateChannel2} = await Channel.apiGetChannelByName(testTeam.name, privateChannel2Name);
        const {post} = await Post.apiGetLastPostInChannel(privateChannel2.id);

        // # Go to the Town Square channel
        await gotoChannel('Town Square');

        // # Post Private Channel 1 Permalink
        const message1 = `${serverUrl}/${testTeam.name}/channels/${privateChannel1Name}`;
        await postMessage(message1);

        // * Check that message is successfully posted
        await expect(element(by.text(message1))).toExist();

        // # Post Private Channel 2's POST Permalink
        const message2 = `${serverUrl}/${testTeam.name}/pl/${post.id}`;
        await postMessage(message2);

        // * Check that message is successfully posted
        await expect(element(by.text(message2))).toExist();

        // # Logout and login as sysadmin
        await logout();
        await ChannelScreen.open({
            username: adminUsername,
            password: adminPassword,
        });

        // * Verify channel screen is visible
        await ChannelScreen.toBeVisible();

        // # Go to the team
        await openTeamSidebar();
        await getTeamByDisplayName(testTeam.display_name).tap();

        // # Press on message 1
        await tapLink(message1);

        // # Press on Join button
        await joinChannel();

        // * Confirm joining the "private channel 1"
        await expect(ChannelScreen.channelIntro).toHaveText('Beginning of ' + privateChannel1Name);

        // # Go to Townsquare
        await gotoChannel('Town Square');

        // # Press on message 2
        await tapLink(message2);

        // # Press on Join button
        await joinChannel();

        // * Verify permalink post list has the message
        await PermalinkScreen.toBeVisible();
        await expect(element(by.text(post.message))).toBeVisible();

        // # Jump to recent messages
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify user is on channel where message is posted
        await expect(ChannelScreen.channelIntro).toHaveText('Beginning of ' + privateChannel2Name);
    });
});

async function createPrivateChannel(channelName) {
    // # Open Mainside bar and press on private channels more button
    await ChannelScreen.openMainSidebar();
    await MainSidebar.openCreatePrivateChannelButton.tap();

    // * Verify create channel screen is visible
    await CreateChannelScreen.toBeVisible();
    await expect(element(by.text('New Private Channel'))).toBeVisible();

    // # Fill the data and create a private channel
    await CreateChannelScreen.nameInput.typeText(channelName);
    await CreateChannelScreen.createButton.tap();

    // * Expect a redirection to the created channel
    await expect(ChannelScreen.channelIntro).toHaveText('Beginning of ' + channelName);
}

async function gotoChannel(name) {
    await ChannelScreen.openMainSidebar();
    const channelItem = MainSidebar.getChannelByDisplayName(name);
    await channelItem.tap();
    await expect(ChannelScreen.channelNavBarTitle).toHaveText(name);
}

async function joinChannel() {
    const button = isAndroid() ? element(by.text('JOIN')) : element(by.label('Join')).atIndex(0);
    await button.tap();
}

async function tapLink(message) {
    const permalinkPost = element(by.text(message));
    await permalinkPost.tap({x: 5, y: 10});
}