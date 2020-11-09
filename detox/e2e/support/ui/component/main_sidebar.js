// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class MainSidebar {
    testID = {
        mainSidebar: 'main.sidebar',
        channelItemDisplayName: 'channel_item.display_name',
        channelsList: 'channels.list',
        addChannel: 'action_button_sidebar.channels',
        addDirectChannel: 'action_button_sidebar.direct',
    }

    mainSidebar = element(by.id(this.testID.mainSidebar));
    channelItemDisplayName = element(by.id(this.testID.channelItemDisplayName));
    channelsList = element(by.id(this.testID.channelsList));
    addChannel = element(by.id(this.testID.addChannel));
    addDirectChannel = element(by.id(this.testID.addDirectChannel));

    toBeVisible = async () => {
        await expect(this.mainSidebar).toBeVisible();

        return this.mainSidebar;
    }

    getChannelByDisplayName = (displayName) => {
        return element(by.text(displayName).withAncestor(by.id(this.testID.channelsList)));
    }

    hasChannelAtIndex = async (index, channelDisplayName) => {
        await expect(
            element(by.id(this.testID.channelItemDisplayName).withAncestor(by.id(this.testID.channelsList))).atIndex(index),
        ).toHaveText(channelDisplayName);
    }
}

const mainSidebar = new MainSidebar();
export default mainSidebar;
