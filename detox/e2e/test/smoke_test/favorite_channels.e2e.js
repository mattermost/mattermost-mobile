// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {
    ChannelInfoScreen,
    ChannelScreen,
} from '@support/ui/screen';
import {Setup} from '@support/server_api';

describe('Favorite Channels', () => {
    let testChannel;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit();
        testChannel = channel;

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3191 should be able to favorite a channel', async () => {
        const {
            closeMainSidebar,
            openMainSidebar,
        } = ChannelScreen;
        const {
            favoriteSwitchFalse,
            favoriteSwitchTrue,
        } = ChannelInfoScreen;
        const {
            getChannelByDisplayName,
            hasChannelDisplayNameAtIndex,
        } = MainSidebar;

        // # Open channel info screen
        await openMainSidebar();
        await getChannelByDisplayName(testChannel.display_name).tap();
        await ChannelInfoScreen.open();

        // * Verify favorite switch is toggled off
        await expect(favoriteSwitchFalse).toBeVisible();
        await expect(favoriteSwitchTrue).not.toBeVisible();

        // # Toggle on favorite switch
        await favoriteSwitchFalse.tap();

        // * Verify favorite switch is toggled on
        await expect(favoriteSwitchTrue).toBeVisible();
        await expect(favoriteSwitchFalse).not.toBeVisible();

        // * Verify channel appears in favorite channels list
        await ChannelInfoScreen.close();
        await openMainSidebar();
        await expect(element(by.text('FAVORITE CHANNELS'))).toBeVisible();
        await hasChannelDisplayNameAtIndex(0, testChannel.display_name);

        // # Close main sidebar
        await closeMainSidebar();
    });
});
