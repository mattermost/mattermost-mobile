// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AccountScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class CustomStatusScreen {
    testID = {
        customStatusScreen: 'custom_status.screen',
        doneButton: 'custom_status.done.button',
    };

    customStatusScreen = element(by.id(this.testID.customStatusScreen));
    doneButton = element(by.id(this.testID.doneButton));

    toBeVisible = async () => {
        await waitFor(this.customStatusScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.customStatusScreen;
    };

    open = async () => {
        // # Open custom status screen
        await AccountScreen.setStatusOption.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.doneButton.tap();
        await expect(this.customStatusScreen).not.toBeVisible();
    };
}

const customStatusScreen = new CustomStatusScreen();
export default customStatusScreen;
