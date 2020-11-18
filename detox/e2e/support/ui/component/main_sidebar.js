// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class MainSidebar {
    testID = {
        mainSidebar: 'main.sidebar',
        channelItemDisplayName: 'channel_item.display_name',
        channelsList: 'channels.list',
        openMoreChannelsButton: 'action_button_sidebar.channels',
        openCreatePrivateChannelButton: 'action_button_sidebar.pg',
        openMoreDirectMessagesButton: 'action_button_sidebar.direct',
    }

    mainSidebar = element(by.id(this.testID.mainSidebar));
    channelItemDisplayName = element(by.id(this.testID.channelItemDisplayName));
    channelsList = element(by.id(this.testID.channelsList));
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
            element(by.id(this.testID.channelItemDisplayName).withAncestor(by.id(this.testID.channelsList))).atIndex(index),
        ).toHaveText(channelDisplayName);
    }
}

const mainSidebar = new MainSidebar();
export default mainSidebar;
