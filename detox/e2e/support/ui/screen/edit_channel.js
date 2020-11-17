// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelInfoScreen} from '@support/ui/screen';

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
        // # Open edit channel screen
        await ChannelInfoScreen.editChannelAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.editChannelScreen).not.toBeVisible();
    }
}

const editChannelScreen = new EditChannelScreen();
export default editChannelScreen;
