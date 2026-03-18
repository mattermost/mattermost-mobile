// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts, wait} from '@support/utils';
import {waitFor} from 'detox';

class ChannelConfigurationScreen {
    testID = {
        channelConfigurationScreen: 'channel_configuration.screen',
        scrollView: 'channel_configuration.scroll_view',
        shareWithConnectedWorkspacesOption: 'channel_settings.share_with_connected_workspaces.option',
    };

    channelConfigurationScreen = element(by.id(this.testID.channelConfigurationScreen));
    scrollView = element(by.id(this.testID.scrollView));
    shareWithConnectedWorkspacesOption = element(by.id(this.testID.shareWithConnectedWorkspacesOption));

    toBeVisible = async () => {
        await waitFor(this.channelConfigurationScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.channelConfigurationScreen;
    };

    openShareWithConnectedWorkspaces = async () => {
        await waitFor(this.shareWithConnectedWorkspacesOption).toBeVisible().whileElement(by.id(this.testID.scrollView)).scroll(50, 'down');
        await wait(timeouts.ONE_SEC);
        await this.shareWithConnectedWorkspacesOption.tap({x: 1, y: 1});
    };
}

const channelConfigurationScreen = new ChannelConfigurationScreen();
export default channelConfigurationScreen;
