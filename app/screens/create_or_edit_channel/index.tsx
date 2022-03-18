// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';

import {MM_TABLES} from '@constants/database';
import ChannelModel from '@typings/database/models/servers/channel';
import ChannelInfoModel from '@typings/database/models/servers/channel_info';

import CreateOrEditChannel from './create_or_edit_channel';

import type {WithDatabaseArgs} from '@typings/database/database';

const {SERVER: {CHANNEL, CHANNEL_INFO}} = MM_TABLES;

type OwnProps = {
    channelId?: string;
}

const enhanced = withObservables([], ({database, channelId}: WithDatabaseArgs & OwnProps) => {
    const channel = channelId ? database.get<ChannelModel>(CHANNEL).findAndObserve(channelId) : of$(undefined);
    const channelInfo = channelId ? database.get<ChannelInfoModel>(CHANNEL_INFO).findAndObserve(channelId) : of$(undefined);
    return {
        channel,
        channelInfo,
    };
});

export default withDatabase(enhanced(CreateOrEditChannel));
