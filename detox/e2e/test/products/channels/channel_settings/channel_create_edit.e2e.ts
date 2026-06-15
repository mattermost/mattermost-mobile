// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T3201: RN apps Create public channel
 * - MM-T3203: RN apps Create private channel
 * - MM-T3199: RN apps Edit public channel
 * - MM-T3206: RN apps Edit private channel
 * - MM-T854: RN apps Channel can be created using 2 non-latin characters
 * - MM-T867: RN apps Copying channel header text
 * - MM-T865: RN apps Copying channel purpose text
 */

import {Channel, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    CreateOrEditChannelScreen,
    LoginScreen,
    HomeScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testUser: any;
    let testTeam: any;
    let publicChannelName: string;
    let publicChannelDisplayName: string;
    let privateChannelName: string;
    let privateChannelDisplayName: string;
    let channelWithMetadata: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // Create a channel with header and purpose for copy tests
        const {channel: metadataChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: `channel-metadata-${getRandomId()}`,
            displayName: `Channel Metadata ${getRandomId()}`,
            type: 'O',
            header: 'This is test header',
            purpose: 'Test purpose for copying',
        });
        channelWithMetadata = metadataChannel;

        await wait(timeouts.THREE_SEC);
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channelWithMetadata.id);
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3201 - RN apps Create public channel', async () => {
        publicChannelName = `channel-${getRandomId()}`;
        publicChannelDisplayName = publicChannelName.replace(/-/g, ' ');
        const channelPurpose = 'This is a test purpose for the channel';
        const channelHeader = ':taco:';

        await ChannelListScreen.headerPlusButton.tap();
        await ChannelListScreen.createNewChannelItem.tap();

        await CreateOrEditChannelScreen.toBeVisible();
        await expect(CreateOrEditChannelScreen.displayNameInput).toBeVisible();
        await expect(CreateOrEditChannelScreen.createButton).toBeVisible();

        await CreateOrEditChannelScreen.displayNameInput.replaceText(publicChannelDisplayName);

        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.replaceText(channelPurpose);

        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.replaceText(channelHeader);

        await CreateOrEditChannelScreen.createButton.tap();
        await ChannelScreen.dismissScheduledPostTooltip();

        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(publicChannelDisplayName);

        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(publicChannelDisplayName);
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(channelPurpose);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T3203 - RN apps Create private channel', async () => {
        privateChannelName = `private-channel-${getRandomId()}`;
        privateChannelDisplayName = privateChannelName.replace(/-/g, ' ');
        const channelPurpose = 'This is a private test channel purpose';
        const channelHeader = 'Private channel header';

        await ChannelListScreen.headerPlusButton.tap();
        await ChannelListScreen.createNewChannelItem.tap();

        await CreateOrEditChannelScreen.toBeVisible();
        await expect(CreateOrEditChannelScreen.displayNameInput).toBeVisible();

        await CreateOrEditChannelScreen.toggleMakePrivateOn();
        await expect(CreateOrEditChannelScreen.makePrivateToggledOn).toBeVisible();

        await CreateOrEditChannelScreen.displayNameInput.replaceText(privateChannelDisplayName);

        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.replaceText(channelPurpose);

        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.replaceText(channelHeader);

        await CreateOrEditChannelScreen.createButton.tap();

        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(privateChannelDisplayName);

        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(privateChannelDisplayName);
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(channelPurpose);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T3199 - RN apps Edit public channel', async () => {
        await ChannelScreen.open(channelsCategory, publicChannelName);
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannel();
        await expect(CreateOrEditChannelScreen.saveButton).toBeVisible();

        const updatedDisplayName = publicChannelDisplayName + ' edited';
        await CreateOrEditChannelScreen.displayNameInput.clearText();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(updatedDisplayName);

        const purposeText = 'Updated purpose for this channel';
        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.clearText();
        await CreateOrEditChannelScreen.purposeInput.replaceText(purposeText);

        const headerLine1 = 'First line of header';
        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.clearText();
        await CreateOrEditChannelScreen.headerInput.replaceText(headerLine1 + '\n');

        const headerLine2 = 'Second line of header';
        await CreateOrEditChannelScreen.headerInput.replaceText(headerLine2);

        await CreateOrEditChannelScreen.saveButton.tap();

        await wait(timeouts.TWO_SEC);
        await ChannelInfoScreen.toBeVisible();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(updatedDisplayName);
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(purposeText);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T3206 - RN apps Edit private channel', async () => {
        await ChannelScreen.open(channelsCategory, privateChannelName);
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannel();
        await expect(CreateOrEditChannelScreen.saveButton).toBeVisible();

        const updatedDisplayName = privateChannelDisplayName + ' edited';
        await CreateOrEditChannelScreen.displayNameInput.clearText();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(updatedDisplayName);

        const purposeText = 'Updated purpose for private channel';
        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.clearText();
        await CreateOrEditChannelScreen.purposeInput.replaceText(purposeText);

        const headerLine1 = 'First line of header';
        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.clearText();
        await CreateOrEditChannelScreen.headerInput.replaceText(headerLine1 + '\n');

        const headerLine2 = 'Second line of header';
        await CreateOrEditChannelScreen.headerInput.replaceText(headerLine2);

        await CreateOrEditChannelScreen.saveButton.tap();

        await wait(timeouts.TWO_SEC);
        await ChannelInfoScreen.toBeVisible();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(updatedDisplayName);
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(purposeText);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T854 - RN apps Channel can be created using 2 non-latin characters', async () => {
        await ChannelListScreen.headerPlusButton.tap();
        await ChannelListScreen.createNewChannelItem.tap();

        await CreateOrEditChannelScreen.toBeVisible();

        await wait(timeouts.ONE_SEC);
        await CreateOrEditChannelScreen.toBeVisible();

        const nonLatinChannelName = 'ÁÜ';
        await CreateOrEditChannelScreen.displayNameInput.replaceText(nonLatinChannelName);
        await wait(timeouts.ONE_SEC);

        await CreateOrEditChannelScreen.createButton.tap();

        await wait(timeouts.TWO_SEC);

        await ChannelScreen.dismissScheduledPostTooltip();

        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(nonLatinChannelName);

        await ChannelScreen.back();
    });

    it('MM-T867 - RN apps Copying channel header text', async () => {
        // # Navigate to the channel with metadata
        await ChannelScreen.open(channelsCategory, channelWithMetadata.name);
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // * Verify header is visible
        await expect(ChannelInfoScreen.extraHeader).toBeVisible();

        // # Test long-press and cancel flow
        await ChannelInfoScreen.cancelCopyChannelHeader(channelWithMetadata.header);

        // * Verify we're still on channel info screen
        await expect(ChannelInfoScreen.channelInfoScreen).toBeVisible();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T865 - RN apps Copying channel purpose text', async () => {
        // # Navigate to the channel with metadata
        await ChannelScreen.open(channelsCategory, channelWithMetadata.name);
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // * Verify purpose is visible
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toBeVisible();

        // # Test long-press and cancel flow
        await ChannelInfoScreen.cancelCopyChannelPurpose(channelWithMetadata.purpose);

        // * Verify we're still on channel info screen
        await expect(ChannelInfoScreen.channelInfoScreen).toBeVisible();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
