// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NavigationHeader} from '@support/ui/component';
import {ChannelListScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class ChannelScreen {
    testID = {
        channelScreen: 'channel.screen',
        introDisplayName: 'channel_post_list.intro.display_name',
        introOptionAddPeopleItem: 'channel_post_list.intro.option_item.add_people',
        introOptionSetHeaderItem: 'channel_post_list.intro.option_item.set_header',
        introOptionChannelDetailsItem: 'channel_post_list.intro.option_item.channel_details',
    };

    channelScreen = element(by.id(this.testID.channelScreen));
    introDisplayName = element(by.id(this.testID.introDisplayName));
    introOptionAddPeopleItem = element(by.id(this.testID.introOptionAddPeopleItem));
    introOptionSetHeaderItem = element(by.id(this.testID.introOptionSetHeaderItem));
    introOptionChannelDetailsItem = element(by.id(this.testID.introOptionChannelDetailsItem));
    backButton = NavigationHeader.backButton;
    headerTitle = NavigationHeader.headerTitle;

    getIntroOptionItemLabel = (introOptionItemTestId: string) => {
        return element(by.id(`${introOptionItemTestId}.label`));
    };

    toBeVisible = async () => {
        await waitFor(this.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.channelScreen;
    };

    open = async (categoryKey: string, channelName: string) => {
        // # Open channel screen
        await ChannelListScreen.getChannelListItemDisplayName(categoryKey, channelName).tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.channelScreen).not.toBeVisible();
    };
}

const channelScreen = new ChannelScreen();
export default channelScreen;
