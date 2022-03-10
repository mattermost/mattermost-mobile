// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {MM_TABLES} from '@constants/database';

import ChannelMention from './channel_mention';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const {SERVER: {MY_CHANNEL}} = MM_TABLES;
const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        myMembers: database.get<MyChannelModel>(MY_CHANNEL).query().observe(),
    };
});

export default withDatabase(enhanced(ChannelMention));
