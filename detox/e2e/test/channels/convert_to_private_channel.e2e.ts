// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {siteOneUrl} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
} from '@support/ui/screen';
import {getAdminAccount, getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Convert to Private Channel', () => {
    const siteOneDisplayName = 'Server 1';

    beforeAll(async () => {

        // # Log in to server as admin
        await ServerScreen.connectToServer(siteOneUrl, siteOneDisplayName);
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

    it('MM-T4972_1 - should be able to convert public channel to private and confirm', async () => {
        // # Create a public channel screen, open channel info screen, and tap on convert to private channel option and confirm
        const channelDisplayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.scheduledPostTooltipCloseButtonAdminAccount.tap();
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.convertToPrivateChannel(channelDisplayName, {confirm: true});

        // * Verify on channel info screen and convert to private channel option does not exist
        await ChannelInfoScreen.toBeVisible();
        await expect(ChannelInfoScreen.convertPrivateOption).not.toExist();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4972_2 - should be able to convert public channel to private and cancel', async () => {
        // # Create a public channel screen, open channel info screen, and tap on convert to private channel option and cancel
        const channelDisplayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.convertToPrivateChannel(channelDisplayName, {confirm: false});

        // * Verify on channel info screen and convert to private channel option still exists
        await ChannelInfoScreen.toBeVisible();
        await expect(ChannelInfoScreen.convertPrivateOption).toExist();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
