// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';
import {waitFor} from 'detox';

// The bottom sheet shown when access is lost to the channel or conversation on screen: "Channel
// unavailable" for a channel policy, "Messages unavailable" for the DM/GM read policy.
class ChannelAccessRevoked {
    testID = {
        sheet: 'channel_access_revoked',
        title: 'channel_access_revoked.title',
        description: 'channel_access_revoked.description',
        okayButton: 'channel_access_revoked.okay.button',
    };

    sheet = element(by.id(this.testID.sheet));
    title = element(by.id(this.testID.title));
    description = element(by.id(this.testID.description));
    okayButton = element(by.id(this.testID.okayButton));

    toBeVisible = async (timeout = timeouts.TEN_SEC) => {
        await waitFor(this.sheet).toBeVisible().withTimeout(timeout);
        return this.sheet;
    };

    dismiss = async () => {
        await this.okayButton.tap();
        await waitFor(this.sheet).not.toExist().withTimeout(timeouts.TEN_SEC);
    };
}

const channelAccessRevoked = new ChannelAccessRevoked();
export default channelAccessRevoked;
