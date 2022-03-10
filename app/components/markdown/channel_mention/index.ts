// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {map, switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import ChannelMention from './channel_mention';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type SystemModel from '@typings/database/models/servers/system';
import type TeamModel from '@typings/database/models/servers/team';

export type ChannelMentions = Record<string, {id?: string; display_name: string; name?: string; team_name: string}>;

const {SERVER: {CHANNEL, SYSTEM, TEAM}} = MM_TABLES;

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID);
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID);
    const channels = currentTeamId.pipe(
        switchMap(({value}) => database.get<ChannelModel>(CHANNEL).query(Q.where('team_id', value)).observeWithColumns(['display_name'])),
    );
    const team = currentTeamId.pipe(
        switchMap(({value}) => database.get<TeamModel>(TEAM).findAndObserve(value)),
    );

    return {
        channels,
        currentTeamId: currentTeamId.pipe(map((ct) => ct.value)),
        currentUserId: currentUserId.pipe(map((cu) => cu.value)),
        team,
    };
});

export default withDatabase(enhance(ChannelMention));
