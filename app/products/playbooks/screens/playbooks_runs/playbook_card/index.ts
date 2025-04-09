// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observePlaybookRunProgress} from '@playbooks/queries/playbooks';
import {queryUsersById} from '@queries/servers/user';

import PlaybookCard, {ITEM_HEIGHT} from './playbook_card';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PlaybookRunModel from '@typings/database/models/servers/playbook_run_model';

type OwnProps = {
    run: PlaybookRunModel;
} & WithDatabaseArgs;

const enhanced = withObservables(['run'], ({run, database}: OwnProps) => {
    return {
        participants: queryUsersById(database, run.participant_ids).observe(),
        progress: observePlaybookRunProgress(database, run.id),
        owner: queryUsersById(database, [run.owner_user_id]).observe().pipe(
            switchMap((users) => (users.length ? users[0].observe() : of$(undefined))),
        ),
    };
});

export {ITEM_HEIGHT as CARD_HEIGHT};
export default withDatabase(enhanced(PlaybookCard));
