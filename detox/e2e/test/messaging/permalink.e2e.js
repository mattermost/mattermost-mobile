// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {ChannelScreen, CreateChannelScreen} from '@support/ui/screen';
import {Channel, Post, Setup} from '@support/server_api';
import {adminUsername, adminPassword, serverUrl} from '@support/test_config';
import {getRandomId} from '@support/utils';
import team from 'app/reducers/views/team';

describe('Messaging', () => {
    let testTeam;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit();
        testTeam = team;

        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-30237 System admins prompted before joining private channel via permalink', async () => {
        const {
            channelNavBarTitle,
            logout,
            openMainSidebar,
            openTeamSidebar,
            postMessage,
        } = ChannelScreen;
        const {getChannelByDisplayName} = MainSidebar;

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
        await openMainSidebar();
        const channelItem = getChannelByDisplayName('Town Square');
        await channelItem.tap();
        await expect(channelNavBarTitle).toHaveText('Town Square');

        // # Post Private Channel 1 Permalink
        const message1 = `${serverUrl}/${testTeam.name}/channels/${privateChannel1Name}`;
        await postMessage(message1);

        // # Post Private Channel 2's POST Permalink
        const message2 = `${serverUrl}/${testTeam.name}/pl/${post.id}`;
        await postMessage(message2);

        // # Logout and login as sysadmin
        await logout();
        await ChannelScreen.open({
            username: adminUsername,
            password: adminPassword,
        });

        await openTeamSidebar();

        await element(by.text(testTeam.name)).tap();

        const permalinkPost = element(by.text(message1));
        await permalinkPost.tap({x: 5, y: 10});

        // await element(by.label('Join')).atIndex(0).tap();

        // const joinButton = await element(by.label('Join')).atIndex(0);
        // await joinButton.tap();

        // await expect(isAndroid() ? element(by.text('Join')) : element(by.label('Join')).atIndex(0)).toBeVisible();
        // (isAndroid() ? element(by.text('Cancel')) : element(by.label('Cancel')).atIndex(0)).tap();
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