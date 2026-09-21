// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, timeouts, wait, waitForElementToExist, withSynchronizationDisabled} from '@support/utils';
import {expect, waitFor} from 'detox';

class BrowseChannelsScreen {
    testID = {
        channelItemPrefix: 'browse_channels.custom_list.channel_item.',
        browseChannelsScreen: 'browse_channels.screen',
        closeButton: 'close.browse_channels.button',
        createButton: 'browse_channels.create.button',
        searchInput: 'browse_channels.search_bar.search.input',
        searchClearButton: 'browse_channels.search_bar.search.clear.button',
        searchCancelButton: 'browse_channels.search_bar.search.cancel.button',
        channelDropdown: 'browse_channels.channel_dropdown',
        channelDropdownTextPublic: 'browse_channels.channel_dropdown.text.public',
        channelDropdownTextArchived: 'browse_channels.channel_dropdown.text.archived',
        channelDropdownTextShared: 'browse_channels.channel_dropdown.text.shared',
        flatChannelList: 'browse_channels.channel_list.flat_list',
        scheduledPostTooltipCloseButton: 'scheduled_post.tooltip.close.button',
    };

    scheduledPostTooltipCloseButton = element(by.id(this.testID.scheduledPostTooltipCloseButton));
    browseChannelsScreen = element(by.id(this.testID.browseChannelsScreen));
    closeButton = element(by.id(this.testID.closeButton));
    createButton = element(by.id(this.testID.createButton));
    searchInput = element(by.id(this.testID.searchInput));
    searchClearButton = element(by.id(this.testID.searchClearButton));
    searchCancelButton = element(by.id(this.testID.searchCancelButton));
    channelDropdown = element(by.id(this.testID.channelDropdown));
    channelDropdownTextPublic = element(by.id(this.testID.channelDropdownTextPublic));
    channelDropdownTextArchived = element(by.id(this.testID.channelDropdownTextArchived));
    channelDropdownTextShared = element(by.id(this.testID.channelDropdownTextShared));
    flatChannelList = element(by.id(this.testID.flatChannelList));

    getChannelItem = (channelName: string) => {
        return element(by.id(`${this.testID.channelItemPrefix}${channelName}`));
    };

    getChannelItemDisplayName = (channelName: string) => {
        return element(by.id(`${this.testID.channelItemPrefix}${channelName}.display_name`));
    };

    toBeVisible = async () => {
        // Use TWENTY_SEC on both platforms — CI simulators/emulators are slower than
        // local devices, so TEN_SEC was timing out on iOS CI before the screen appeared.
        await waitFor(this.browseChannelsScreen).toExist().withTimeout(timeouts.TWENTY_SEC);

        return this.browseChannelsScreen;
    };

    open = async () => {
        // If Browse Channels is already open (e.g. a previous test failed mid-navigation
        // and left the modal on screen), close it first so we start from the channel list.
        try {
            await waitFor(this.browseChannelsScreen).toExist().withTimeout(2000);
            await this.closeButton.tap();
            await waitFor(this.browseChannelsScreen).not.toExist().withTimeout(timeouts.TEN_SEC);
        } catch {
            // Browse Channels is not open — proceed normally
        }

        // # Open browse channels screen from the channel list header plus button.
        await ChannelListScreen.openPlusMenu();

        // openPlusMenu disables synchronization for the plus tap on Android precisely because
        // the app is busy there, but re-enables it in its own finally -- so this tap, one line
        // later, met the same busy app with sync back on. Detox then waits for idle before
        // dispatching, and MM-T1719_1 timed out with both RN loopers ("mqt_v_js",
        // "mqt_v_native") executing and this exact invocation unanswered:
        //   matcherForTestId("plus_menu_item.browse_channels") ... click
        // Extend the same Android-only window over the menu-item tap. withSynchronizationDisabled
        // is depth-counted, so it nests safely.
        //
        // NOTE: unverified against MM-T1719_1 -- that failure does not reproduce locally, clean
        // or under CPU load. This closes a real gap in sync coverage and matches the treatment
        // the adjacent tap already gets, but it is not confirmed to be the cause.
        if (isAndroid()) {
            await withSynchronizationDisabled(async () => {
                await ChannelListScreen.browseChannelsItem.tap();
            });
        } else {
            await ChannelListScreen.browseChannelsItem.tap();
        }
        await wait(timeouts.ONE_SEC);

        // openPlusMenu disables sync on Android; wait for the screen before returning.
        await waitForElementToExist(this.browseChannelsScreen, timeouts.TWENTY_SEC);

        return this.browseChannelsScreen;
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.browseChannelsScreen).not.toBeVisible();
    };

    dismissScheduledPostTooltip = async () => {
        try {
            await this.scheduledPostTooltipCloseButton.tap();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('Element not visible, skipping click');
        }
    };
}

const browseChannelsScreen = new BrowseChannelsScreen();
export default browseChannelsScreen;
