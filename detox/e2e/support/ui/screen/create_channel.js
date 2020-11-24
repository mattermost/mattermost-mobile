// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EditChannelInfo} from '@support/ui/component';

class CreateChannelScreen {
    testID = {
        createChannelScreen: 'create_channel.screen',
        createButton: 'create_channel.create.button',
        backButton: 'screen.back.button',
    }

    createChannelScreen = element(by.id(this.testID.createChannelScreen));
    createButton = element(by.id(this.testID.createButton));
    backButton = element(by.id(this.testID.backButton));

    // convenience props
    nameInput = EditChannelInfo.nameInput;
    purposeInput = EditChannelInfo.purposeInput;
    headerInput = EditChannelInfo.headerInput;

    toBeVisible = async () => {
        await expect(this.createChannelScreen).toBeVisible();

        return this.createChannelScreen;
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.createChannelScreen).not.toBeVisible();
    }
}

const createChannelScreen = new CreateChannelScreen();
export default createChannelScreen;
