// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$} from 'rxjs';

import {General} from '@constants';
import ChannelModel from '@typings/database/models/servers/channel';
import MyChannelModel from '@typings/database/models/servers/my_channel';
import MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';

import ChannelItem from './channel_item';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    channel: ChannelModel;
    myChannel: MyChannelModel;
    settings: MyChannelSettingsModel;
}

const enhance = withObservables(['channel', 'myChannel', 'settings'], ({channel, myChannel, settings}: EnhanceProps) => {
    let membersCount = of$(0);
    if (channel.type === General.GM_CHANNEL) {
        membersCount = channel.members.observeCount();
    }

    return {
        channel: channel.observe(),
        myChannel: myChannel.observe(),
        settings: settings.observe(),
        membersCount,
    };
});

export default React.memo(withDatabase(enhance(ChannelItem)));
