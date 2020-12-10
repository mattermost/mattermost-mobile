// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostOptions} from '@support/ui/component';

class AddReactionScreen {
    testID = {
        addReactionScreen: 'add_reaction.screen',
        closeAddReactionButton: 'close.add_reaction.button',
    }

    addReactionScreen = element(by.id(this.testID.addReactionScreen));
    closeAddReactionButton = element(by.id(this.testID.closeAddReactionButton));

    toBeVisible = async () => {
        await expect(this.addReactionScreen).toBeVisible();

        return this.addReactionScreen;
    }

    open = async () => {
        // # Open add reaction screen
        await PostOptions.openAddReactionButton.tap();

        return this.toBeVisible();
    }

    close = async () => {
        await this.closeAddReactionButton.tap();
        await expect(this.addReactionScreen).not.toBeVisible();
    }
}

const addReactionScreen = new AddReactionScreen();
export default addReactionScreen;
