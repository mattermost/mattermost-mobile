// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelInfoScreen} from '@support/ui/screen';

class CreateChannelScreen {
    testID = {
        createChannelScreen: 'create_channel.screen',
        nameInput: 'edit_channel.name.input',
        purposeInput: 'edit_channel.purpose.input',
        headerInput: 'edit_channel.header.input',
        createButton: 'edit_channel.create.button',
        backButton: 'screen.back.button',
    }

    createChannelScreen = element(by.id(this.testID.createChannelScreen));
    nameInput = element(by.id(this.testID.nameInput));
    purposeInput = element(by.id(this.testID.purposeInput));
    headerInput = element(by.id(this.testID.headerInput));
    createButton = element(by.id(this.testID.createButton));
    backButton = element(by.id(this.testID.backButton));

    toBeVisible = async () => {
        await expect(this.createChannelScreen).toBeVisible();

        return this.createChannelScreen;
    }

    open = async () => {
        // # Open channel info screen
        await ChannelInfoScreen.open();

        // # Tap on Edit Channel
        await ChannelInfoScreen.editChannelAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.createChannelScreen).not.toBeVisible();
    }
}

const createChannelScreen = new CreateChannelScreen();
export default createChannelScreen;
