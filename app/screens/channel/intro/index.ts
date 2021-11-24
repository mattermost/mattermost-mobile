// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {MM_TABLES} from '@app/constants/database';
import {WithDatabaseArgs} from '@typings/database/database';
import ChannelModel from '@typings/database/models/servers/channel';

import Intro from './intro';

const {SERVER: {CHANNEL}} = MM_TABLES;

const enhanced = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => ({
    channel: database.get<ChannelModel>(CHANNEL).findAndObserve(channelId),
}));

export default withDatabase(enhanced(Intro));
