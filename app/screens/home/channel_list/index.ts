// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {MM_TABLES} from '@constants/database';
import MyTeamModel from '@typings/database/models/servers/my_team';

import ChannelsList from './channel_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const {SERVER: {MY_TEAM}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    teamsCount: database.get<MyTeamModel>(MY_TEAM).query().observeCount(),
}));

export default withDatabase(enhanced(ChannelsList));
