// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NavigationHeader} from '@support/ui/component';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class GlobalThreadsScreen {
    testID = {
        globalThreadsScreen: 'global_threads.screen',
    };

    globalThreadsScreen = element(by.id(this.testID.globalThreadsScreen));

    // convenience props
    backButton = NavigationHeader.backButton;

    toBeVisible = async () => {
        await waitFor(this.globalThreadsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.globalThreadsScreen;
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.globalThreadsScreen).not.toBeVisible();
    };
}

const globalThreadsScreen = new GlobalThreadsScreen();
export default globalThreadsScreen;
