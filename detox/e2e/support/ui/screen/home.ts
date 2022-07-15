// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    AccountScreen,
    LoginScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class HomeScreen {
    testID = {
        channelListTab: 'tab_bar.home.tab',
        searchTab: 'tab_bar.search.tab',
        mentionsTab: 'tab_bar.mentions.tab',
        savedMessagesTab: 'tab_bar.saved_messages.tab',
        accountTab: 'tab_bar.account.tab',
    };

    channelListTab = element(by.id(this.testID.channelListTab));
    searchTab = element(by.id(this.testID.searchTab));
    mentionsTab = element(by.id(this.testID.mentionsTab));
    savedMessagesTab = element(by.id(this.testID.savedMessagesTab));
    accountTab = element(by.id(this.testID.accountTab));

    toBeVisible = async () => {
        await waitFor(this.channelListTab).toExist().withTimeout(timeouts.TEN_SEC);

        return this.channelListTab;
    };

    open = async (user = {}) => {
        // # Open home screen
        await LoginScreen.login(user);

        return this.toBeVisible();
    };

    logout = async (serverDisplayName: string | null = null) => {
        await AccountScreen.open();
        await AccountScreen.logout(serverDisplayName);
        await expect(this.channelListTab).not.toBeVisible();
    };
}

const homeScreen = new HomeScreen();
export default homeScreen;
