// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelScreen} from '@support/ui/component';
import {MainSidebar} from '@support/ui/screen';

class DirectChannelsScreen {
    testID = {
        directChannelsScreen: 'direct_channels.screen',
        startButton: 'start-conversation',
    }

    directChannelsScreen = element(by.id(this.testID.directChannelsScreen));
    startButton = element(by.id(this.testID.startButton));

    getUserAtIndex = (index) => {
        return element(by.id('more_dms.user').withAncestor(by.id('more_dms.list'))).atIndex(index);
    }

    toBeVisible = async () => {
        await expect(this.directChannelsScreen).toBeVisible();

        return this.directChannelsScreen;
    }

    open = async () => {
        await ChannelScreen.mainSidebarDrawerButton.tap();
        await MainSidebar.addDirectChannel.tap();

        return this.toBeVisible();
    }
}

const directChannelsScreen = new DirectChannelsScreen();
export default directChannelsScreen;
