// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {serverTwoUrl} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    CreateOrEditChannelScreen,
    FindChannelsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
} from '@support/ui/screen';
import {getAdminAccount, getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Unarchive Channel', () => {
    const serverOneDisplayName = 'Server 1';

    beforeAll(async () => {

        // # Log in to server as admin
        await ServerScreen.connectToServer(serverTwoUrl, serverOneDisplayName);
        await LoginScreen.loginAsAdmin(getAdminAccount());
        await wait(timeouts.TWO_SEC);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await waitFor(ChannelListScreen.channelListScreen).toBeVisible().withTimeout(timeouts.TWO_MIN);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4944_1 - should be able to unarchive a public channel and confirm', async () => {
        // # Create a public channel screen, open channel info screen, and tap on archive channel option and confirm
        const channelDisplayName = `Channel ${getRandomId()}`;
        const channelName = channelDisplayName.toLowerCase().replace(/ /g, '-');

        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.FOUR_SEC);
        await expect(ChannelScreen.scheduledPostTooltipCloseButtonAdminAccount).toBeVisible();
        await ChannelScreen.scheduledPostTooltipCloseButtonAdminAccount.tap();
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.archivePublicChannel({confirm: true});

        // * Verify on public channel screen and archived post draft is displayed
        await ChannelListScreen.toBeVisible();
        await FindChannelsScreen.open();
        await FindChannelsScreen.searchInput.typeText(channelDisplayName);

        // * Verify search returns the target archived channel item
        await wait(timeouts.TWO_SEC);
        try {
            await FindChannelsScreen.getFilteredArchivedChannelItem(channelName).tap();
        } catch {
            // Retry tapping the archived channel item if the first attempt fails
            await FindChannelsScreen.getFilteredChannelItem(channelName).tap();
        }

        // * Verify on archievd channel name
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channelDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(channelDisplayName);

        // # Go back to channel list screen by closing archived channel

        // # Open channel info screen, tap on unarchive channel and confirm, close and re-open app to reload, and re-open unarchived public channel
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.unarchivePublicChannel({confirm: true});
        await wait(timeouts.FOUR_SEC);

        // * Verify on unarchived public channel screen and active post draft is displayed
        await expect(ChannelScreen.postDraft).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4944_2 - should be able to unarchive a private channel and confirm', async () => {
        // # Create a private channel screen, open channel info screen, and tap on archive channel option and confirm
        const channelDisplayName = `Channel ${getRandomId()}`;
        const channelName = channelDisplayName.toLowerCase().replace(/ /g, '-');
        await CreateOrEditChannelScreen.openCreateChannel();

        await CreateOrEditChannelScreen.toggleMakePrivateOn();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.FOUR_SEC);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.archivePrivateChannel({confirm: true});

        await ChannelListScreen.toBeVisible();
        await FindChannelsScreen.open();
        await FindChannelsScreen.searchInput.typeText(channelDisplayName);

        // * Verify search returns the target archived channel item
        await wait(timeouts.TWO_SEC);
        try {
            await FindChannelsScreen.getFilteredArchivedChannelItem(channelName).tap();
        } catch {
            // Retry tapping the archived channel item if the first attempt fails
            await FindChannelsScreen.getFilteredChannelItem(channelName).tap();
        }
        await wait(timeouts.TWO_SEC);

        // * Verify on archievd channel name
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channelDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(channelDisplayName);

        // * Verify on private channel screen and archived post draft is displayed
        await expect(ChannelScreen.postDraftArchived).toBeVisible();

        // # Open channel info screen, tap on unarchive channel and confirm, close and re-open app to reload, and re-open unarchived private channel
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.unarchivePrivateChannel({confirm: true});
        await wait(timeouts.FOUR_SEC);

        // * Verify on unarchived private channel screen and active post draft is displayed
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.postDraft).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
