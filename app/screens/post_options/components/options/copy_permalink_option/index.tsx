// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/dist/types/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import CopyPermalinkOption from './copy_permalink_option';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';
import type TeamModel from '@typings/database/models/servers/team';

const {SERVER: {SYSTEM, TEAM}} = MM_TABLES;
const {CURRENT_TEAM_ID} = SYSTEM_IDENTIFIERS;

const enhanced = withObservables(['post'], ({post, database}: WithDatabaseArgs & { post: PostModel }) => {
    const currentTeamId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_TEAM_ID);
    const channel = post.channel.observe();

    const teamName = combineLatest([channel, currentTeamId]).pipe(
        switchMap(([c, tid]) => {
            const teamId = c.teamId || tid;
            return database.
                get<TeamModel>(TEAM).
                findAndObserve(teamId).
                pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((team: TeamModel) => of$(team.name)),
                );
        }),
    );

    return {
        teamName,
    };
});

export default withDatabase(enhanced(CopyPermalinkOption));
