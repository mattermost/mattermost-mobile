// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EditChannelInfo} from '@support/ui/component';
import {ChannelInfoScreen} from '@support/ui/screen';

class EditChannelScreen {
    testID = {
        editChannelScreen: 'edit_channel.screen',
        saveButton: 'edit_channel.save.button',
        backButton: 'screen.back.button',
    }

    editChannelScreen = element(by.id(this.testID.editChannelScreen));
    saveButton = element(by.id(this.testID.saveButton));
    backButton = element(by.id(this.testID.backButton));

    // convenience props
    nameInput = EditChannelInfo.nameInput;
    purposeInput = EditChannelInfo.purposeInput;
    headerInput = EditChannelInfo.headerInput;

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
