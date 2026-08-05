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
import {
    ChannelListScreen,
    ChannelScreen,
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Create Channel and Edit Channel Header', () => {

    const serverOneDisplayName = 'Server 1';

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4731_2 - should be able to create a public channel and edit the channel header', async () => {
        // # Open create channel screen, toggle make private off, fill out channel info, and tap create button
        const suffix = getRandomId();
        const displayName = `Channel ${suffix}`;
        const purpose = `Purpose ${suffix}`;
        const header = `Header ${suffix}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await expect(CreateOrEditChannelScreen.makePrivateToggledOff).toBeVisible();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(displayName);
        await CreateOrEditChannelScreen.purposeInput.replaceText(purpose);
        await CreateOrEditChannelScreen.headerInput.replaceText(header);
        await CreateOrEditChannelScreen.createButton.tap();
        await ChannelScreen.dismissScheduledPostTooltip();

        // * Verify on newly created public channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(displayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(displayName);

        // # Tap on set header action to edit the channel header
        await ChannelScreen.introSetHeaderAction.tap();

        // * Verify channel header is correct
        if (isIos()) {
            await expect(CreateOrEditChannelScreen.headerInput).toHaveValue(header);
        } else {
            await expect(CreateOrEditChannelScreen.headerInput).toHaveText(header);
        }

        // # Edit the channel header, save, and re-open edit channel header screen
        await CreateOrEditChannelScreen.headerInput.replaceText(`${header} edit`);
        await CreateOrEditChannelScreen.saveButton.tap();
        await wait(timeouts.TWO_SEC);
        await CreateOrEditChannelScreen.openEditChannelHeader();

        // * Verify channel header has new value
        if (isIos()) {
            await expect(CreateOrEditChannelScreen.headerInput).toHaveValue(`${header} edit`);
        } else {
            await expect(CreateOrEditChannelScreen.headerInput).toHaveText(`${header} edit`);
        }

        // # Go back to channel list screen
        await CreateOrEditChannelScreen.close();
        await ChannelScreen.back();
    });
});
