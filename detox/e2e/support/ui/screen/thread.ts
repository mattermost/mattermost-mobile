// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NavigationHeader} from '@support/ui/component';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class ThreadScreen {
    testID = {
        threadScreen: 'channel.screen',
    };

    threadScreen = element(by.id(this.testID.threadScreen));

    // convenience props
    backButton = NavigationHeader.backButton;

    toBeVisible = async () => {
        await waitFor(this.threadScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.threadScreen;
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.threadScreen).not.toBeVisible();
    };
}

const threadScreen = new ThreadScreen();
export default threadScreen;
