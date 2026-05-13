// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    ChannelSettingsScreen,
    FindChannelsScreen,
    LoginScreen,
    ServerScreen,
    HomeScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait, waitForElementToNotExist} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const favoritesCategory = 'favorites';
    let testUser: any;
    let testTeam: any;
    let testChannel: any;
    let archiveChannel: any;

    beforeAll(async () => {
        const {user, channel, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testChannel = channel;
        testTeam = team;

        // Create a separate channel for archiving test
        const {channel: archiveCh} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: `archive-test-${getRandomId()}`,
            displayName: `Archive Test ${getRandomId()}`,
            type: 'O',
        });
        if (!archiveCh?.id) {
            throw new Error('[beforeAll] Failed to create archive test channel');
        }
        archiveChannel = archiveCh;

        await wait(timeouts.THREE_SEC);
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, archiveChannel.id);
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3189 - RN apps Display channel list', async () => {
        await expect(ChannelListScreen.channelListScreen).toBeVisible();
        await wait(timeouts.ONE_SEC);
    });

    it('MM-T3190 - RN apps Display Channel Info', async () => {
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.toBeVisible();

        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);
        await expect(ChannelInfoScreen.channelInfoScreen).toBeVisible();
        await wait(timeouts.ONE_SEC);
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T3191 - RN apps Change channel', async () => {

        await FindChannelsScreen.open();
        await wait(timeouts.ONE_SEC);

        const searchTerm = testChannel.name.substring(0, 3);
        await FindChannelsScreen.searchInput.typeText(searchTerm);
        await wait(timeouts.TWO_SEC);

        await expect(FindChannelsScreen.getFilteredChannelItem(testChannel.name)).toBeVisible();
        await FindChannelsScreen.getFilteredChannelItem(testChannel.name).tap();
        await wait(timeouts.ONE_SEC);

        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
        await ChannelScreen.back();
    });

    it('MM-T850 - RN apps Favorite a channel', async () => {
        await ChannelScreen.open(channelsCategory, testChannel.name);

        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.favoriteAction).toBeVisible();
        await ChannelInfoScreen.favoriteAction.tap();

        await wait(timeouts.ONE_SEC);
        await expect(ChannelInfoScreen.unfavoriteAction).toBeVisible();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // * Verify channel is listed under favorites category
        await expect(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name)).toBeVisible();
    });

    it('MM-T3192 - RN apps Un-favorite a channel', async () => {
        await ChannelScreen.open(favoritesCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.unfavoriteAction).toBeVisible();

        await ChannelInfoScreen.unfavoriteAction.tap();

        await wait(timeouts.THREE_SEC);
        await expect(ChannelInfoScreen.favoriteAction).toBeVisible();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible();
    });

    it('MM-T3197 - RN apps Archive public or private channel', async () => {
        // # Navigate to the archive channel
        await ChannelScreen.open(channelsCategory, archiveChannel.name);
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Open channel settings to access archive option
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();

        // # Archive the channel
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        // After archiving with ExperimentalViewArchivedChannels=true (the default), the app
        // calls dismissModal(channelSettings) which dismisses the entire ChannelInfo modal
        // stack (ChannelInfo + ChannelSettings), returning to the channel screen in archived
        // (read-only) state. popToRoot() is NOT called in this code path — the channel list
        // is NOT automatically shown. The test must explicitly navigate back.
        //
        // * Verify the channel screen now shows the archived (read-only) state
        await expect(ChannelScreen.postDraftArchivedCloseChannelButton).toBeVisible();

        // # Navigate back from the archived channel to the channel list
        await ChannelScreen.back();

        // * Verify we're back at channel list
        await ChannelListScreen.toBeVisible();

        // * Verify archived channel is not visible in the list
        // On Android, waitFor().not.toBeVisible() blocks on bridge-idle before evaluating —
        // after the back() navigation the bridge is still busy, causing the 10s budget to
        // expire before the check runs. Use polling waitForElementToNotExist (bypasses
        // bridge-idle) on Android; keep the standard waitFor for iOS.
        const archivedChannelItem = ChannelListScreen.getChannelItemDisplayName(channelsCategory, archiveChannel.name);
        if (isAndroid()) {
            await waitForElementToNotExist(archivedChannelItem, timeouts.HALF_MIN);
        } else {
            await waitFor(archivedChannelItem).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        }
    });
});
