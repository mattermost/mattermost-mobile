// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {HomeScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';

class AccountScreen {
    testID = {
        accountScreen: 'account.screen',
        logoutAction: 'account.logout.action',
    };

    accountScreen = element(by.id(this.testID.accountScreen));
    logoutAction = element(by.id(this.testID.logoutAction));

    toBeVisible = async () => {
        await waitFor(this.accountScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.accountScreen;
    };

    open = async () => {
        // # Open account screen
        await HomeScreen.accountTab.tap();

        return this.toBeVisible();
    };

    logout = async (serverDisplayName = null) => {
        await this.logoutAction.tap();
        if (serverDisplayName) {
            await expect(Alert.logoutTitle(serverDisplayName)).toBeVisible();
        }
        await Alert.logoutButton.tap();
        await expect(this.accountScreen).not.toBeVisible();
    };
}

const accountScreen = new AccountScreen();
export default accountScreen;
