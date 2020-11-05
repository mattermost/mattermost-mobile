// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelScreen} from '@support/ui/screen';
import {isAndroid} from '@support/utils';

class SearchScreen {
    testID = {
        searchScreen: 'search.screen',
        searchInput: 'searchInput',
        searchFromSection: 'search_from.section',
        searchInSection: 'search_in.section',
        searchOnSection: 'search_on.section',
    }

    searchScreen = element(by.id(this.testID.searchScreen));
    searchInput = element(by.id(this.testID.searchInput));
    searchFromSection = element(by.id(this.testID.searchFromSection));
    searchInSection = element(by.id(this.testID.searchInSection));
    searchOnSection = element(by.id(this.testID.searchOnSection));

    toBeVisible = async () => {
        await expect(this.searchScreen).toBeVisible();

        return this.searchScreen;
    }

    open = async () => {
        await ChannelScreen.channelSearchButton.tap();

        return this.toBeVisible();
    }

    cancel = async () => {
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await element(by.text('Cancel')).atIndex(0).tap();
        }
    }
}

const searchScreen = new SearchScreen();
export default searchScreen;
