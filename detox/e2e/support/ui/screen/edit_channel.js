// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelScreen} from '@support/ui/screen';

class EditChannelScreen {
    testID = {
        editChannelScreen: 'edit_channel.screen',
        editChannelHeaderInput: 'edit_channel.header.input',
        backButton: 'screen.back.button',
    }

    editChannelScreen = element(by.id(this.testID.editChannelScreen));
    editChannelHeaderInput = element(by.id(this.testID.editChannelHeaderInput));
    backButton = element(by.id(this.testID.backButton));

    toBeVisible = async () => {
        await expect(this.editChannelScreen).toBeVisible();

        return this.editChannelScreen;
    }

    open = async () => {
        // # Open channel menu then tap 'Edit Channel'
        await ChannelScreen.channelTitleButton.tap();
        await element(by.text('Edit Channel')).tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.editChannelScreen).not.toBeVisible();
    }
}

const editChannelScreen = new EditChannelScreen();
export default editChannelScreen;
