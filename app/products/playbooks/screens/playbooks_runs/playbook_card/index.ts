// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';

import {observePlaybookRunProgress} from '@playbooks/database/queries/run';
import {getProgressFromRun} from '@playbooks/utils/progress';
import {observeUser, queryUsersById} from '@queries/servers/user';

import PlaybookCard, {ITEM_HEIGHT} from './playbook_card';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    run: PlaybookRunModel | PlaybookRun;
} & WithDatabaseArgs;

const enhanced = withObservables(['run'], ({run, database}: OwnProps) => {
    if ('participants' in run) {
        return {
            run: run.observe(),
            participants: run.participants().observe(),
            progress: observePlaybookRunProgress(database, run.id),
            owner: run.owner.observe(),
        };
    }

    const participants = queryUsersById(database, run.participant_ids).observe();
    const owner = observeUser(database, run.owner_user_id);

    return {
        run: of$(run),
        participants,
        progress: of$(getProgressFromRun(run)),
        owner,
    };
});

export {ITEM_HEIGHT as CARD_HEIGHT};
export default withDatabase(enhanced(PlaybookCard));
