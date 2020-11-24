// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class MainSidebar {
    testID = {
        mainSidebar: 'main.sidebar',
        channelsList: 'main.sidebar.channels_list',
        channelItemDisplayName: 'main.sidebar.channels_list.list.channel_item.display_name',
        filteredChannelItemDisplayName: 'main.sidebar.channels_list.filtered_list.channel_item.display_name',
        openMoreChannelsButton: 'action_button_sidebar.channels',
        openCreatePrivateChannelButton: 'action_button_sidebar.pg',
        openMoreDirectMessagesButton: 'action_button_sidebar.direct',
    }

    mainSidebar = element(by.id(this.testID.mainSidebar));
    channelsList = element(by.id(this.testID.channelsList));
    channelItemDisplayName = element(by.id(this.testID.channelItemDisplayName));
    filteredChannelItemDisplayName = element(by.id(this.testID.filteredChannelItemDisplayName));
    openMoreChannelsButton = element(by.id(this.testID.openMoreChannelsButton));
    openCreatePrivateChannelButton = element(by.id(this.testID.openCreatePrivateChannelButton));
    openMoreDirectMessagesButton = element(by.id(this.testID.openMoreDirectMessagesButton));

    getChannelByDisplayName = (displayName) => {
        return element(by.text(displayName).withAncestor(by.id(this.testID.channelsList)));
    }

    toBeVisible = async () => {
        await expect(this.mainSidebar).toBeVisible();

        return this.mainSidebar;
    }

    hasChannelAtIndex = async (index, channelDisplayName) => {
        await expect(
            element(by.id(this.testID.channelItemDisplayName)).atIndex(index),
        ).toHaveText(channelDisplayName);
    }

    hasFilteredChannelAtIndex = async (index, filteredChannelItemDisplayName) => {
        await expect(
            element(by.id(this.testID.filteredChannelItemDisplayName)).atIndex(index),
        ).toHaveText(filteredChannelItemDisplayName);
    }
}

const mainSidebar = new MainSidebar();
export default mainSidebar;
