// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';

class MmBlocksTextInputScreen {
    testID = {
        screen: 'mm_blocks_text_input.screen',
        input: 'mm_blocks_text_input.input',
        saveButton: 'mm_blocks.text_input.save.button',
    };

    screen = element(by.id(this.testID.screen));
    input = element(by.id(this.testID.input));
    saveButton = element(by.id(this.testID.saveButton));

    toBeVisible = async (shouldBeVisible = true) => {
        if (shouldBeVisible) {
            await waitFor(this.screen).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            await waitFor(this.screen).not.toExist().withTimeout(timeouts.TEN_SEC);
        }
        return this.screen;
    };
}

const mmBlocksTextInputScreen = new MmBlocksTextInputScreen();
export default mmBlocksTextInputScreen;
