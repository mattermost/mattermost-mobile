// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MainSidebar} from '@support/ui/component';

class MoreDirectMessagesScreen {
    testID = {
        moreDirectMessagesScreen: 'more_direct_messages.screen',
        startButton: 'more_direct_messages.start.button',
        list: 'more_direct_messages.list',
        user: 'more_direct_messages.user',
    }

    moreDirectMessagesScreen = element(by.id(this.testID.moreDirectMessagesScreen));
    startButton = element(by.id(this.testID.startButton));

    getUserAtIndex = (index) => {
        return element(by.id(this.testID.user).withAncestor(by.id(this.testID.list))).atIndex(index);
    }

    toBeVisible = async () => {
        await expect(this.moreDirectMessagesScreen).toBeVisible();

        return this.moreDirectMessagesScreen;
    }

    open = async () => {
        // # Open more direct messages screen
        await MainSidebar.openMoreDirectMessagesButton.tap();

        return this.toBeVisible();
    }
}

const moreDirectMessagesScreen = new MoreDirectMessagesScreen();
export default moreDirectMessagesScreen;
