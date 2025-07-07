// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';

import {observePlaybookRunProgress, queryParticipantsFromAPIRun} from '@playbooks/database/queries/run';
import {getProgressFromRun} from '@playbooks/utils/progress';
import {observeUser} from '@queries/servers/user';

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
            owner: observeUser(database, run.ownerUserId),
        };
    }

    return {
        run: of$(run),
        participants: queryParticipantsFromAPIRun(database, run).observe(),
        progress: of$(getProgressFromRun(run)),
        owner: observeUser(database, run.owner_user_id),
    };
});

export {ITEM_HEIGHT as CARD_HEIGHT};
export default withDatabase(enhanced(PlaybookCard));
