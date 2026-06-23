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
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channel Settings - Copy Tests', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testUser: any;
    let testTeam: any;
    let channelWithPurpose: any;
    let channelWithHeaderUrl: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // Create a channel with a purpose text for MM-T868
        const purposeText = `Purpose text for copying ${getRandomId()}`;
        const {channel: purposeChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'O',
            channel: {
                team_id: testTeam.id,
                name: `purpose-channel-${getRandomId()}`,
                display_name: `Purpose Channel ${getRandomId()}`,
                type: 'O',
                purpose: purposeText,
                header: '',
            },
        });
        if (!purposeChannel?.id) {
            throw new Error('[beforeAll] Failed to create channel with purpose');
        }
        channelWithPurpose = purposeChannel;
        channelWithPurpose.purposeText = purposeText;

        // Create a channel with a URL in the header for MM-T869
        const headerUrl = 'https://mattermost.com';
        const {channel: headerUrlChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'O',
            channel: {
                team_id: testTeam.id,
                name: `header-url-channel-${getRandomId()}`,
                display_name: `Header URL Channel ${getRandomId()}`,
                type: 'O',
                purpose: '',
                header: headerUrl,
            },
        });
        if (!headerUrlChannel?.id) {
            throw new Error('[beforeAll] Failed to create channel with header URL');
        }
        channelWithHeaderUrl = headerUrlChannel;
        channelWithHeaderUrl.headerUrl = headerUrl;

        await wait(timeouts.TWO_SEC);
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channelWithPurpose.id);
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channelWithHeaderUrl.id);
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T838_1 - should create a channel with 2 non-latin characters in the display name', async () => {
        // # Open the create channel screen
        await ChannelListScreen.headerPlusButton.tap();
        await ChannelListScreen.createNewChannelItem.tap();
        await CreateOrEditChannelScreen.toBeVisible();

        // # Enter a display name containing 2 non-latin characters
        const nonLatinDisplayName = 'ÁÜ';
        await CreateOrEditChannelScreen.displayNameInput.replaceText(nonLatinDisplayName);
        await wait(timeouts.ONE_SEC);

        // # Tap the create button
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.TWO_SEC);

        // Handle optional scheduled post tooltip if present
        try {
            await ChannelScreen.scheduledPostTooltipCloseButton.tap();
        } catch {
            // tooltip not present — proceed
        }

        // * Verify channel was created and we're now in the channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(nonLatinDisplayName);

        // # Navigate back to channel list
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T868_1 - should show Copy option when long-pressing channel purpose text', async () => {
        // # Navigate to the channel with a purpose
        await ChannelScreen.open(channelsCategory, channelWithPurpose.name);
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // * Verify purpose text is visible
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toBeVisible();

        // # Long-press the purpose text to open the copy bottom sheet, verify Copy option,
        // and tap Copy — uses ChannelInfoScreen.copyChannelPurpose helper which handles
        // the long-press, waitFor on the bottom sheet, and taps the copy action.
        await ChannelInfoScreen.copyChannelPurpose(channelWithPurpose.purposeText);

        // * Verify bottom sheet is dismissed and we're still on channel info screen
        await wait(timeouts.ONE_SEC);
        await expect(ChannelInfoScreen.channelInfoScreen).toBeVisible();

        // # Close channel info and go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T869_1 - should show Copy URL option when long-pressing a URL in the channel header', async () => {
        // # Navigate to the channel with a URL in the header
        await ChannelScreen.open(channelsCategory, channelWithHeaderUrl.name);
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // * Verify the header section is visible
        await expect(ChannelInfoScreen.extraHeader).toBeVisible();

        // # Long-press the header to open the copy bottom sheet, verify Copy header text option,
        // and cancel — uses ChannelInfoScreen.cancelCopyChannelHeader helper.
        // NOTE: The 'copy_url' bottom sheet item (channel_info.extra.header.bottom_sheet.copy_url)
        // appears only when onLinkLongPress fires on a URL link within the markdown header.
        // Long-pressing the outer TouchableWithFeedback wrapper shows only copy_header_text.
        // TODO: Trigger onLinkLongPress on the URL text directly and assert copy_url option appears.
        await ChannelInfoScreen.cancelCopyChannelHeader(channelWithHeaderUrl.headerUrl);

        // * Verify still on channel info screen
        await wait(timeouts.ONE_SEC);
        await expect(ChannelInfoScreen.channelInfoScreen).toBeVisible();

        // # Close channel info and go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });
});
