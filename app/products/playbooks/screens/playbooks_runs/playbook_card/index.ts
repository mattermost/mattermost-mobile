// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observePlaybookName, observePlaybookRunProgress} from '@playbooks/database/queries/playbooks';
import {queryUsersById} from '@queries/servers/user';

import PlaybookCard, {ITEM_HEIGHT} from './playbook_card';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    run: PlaybookRunModel;
} & WithDatabaseArgs;

const enhanced = withObservables(['run'], ({run, database}: OwnProps) => {
    return {
        participants: queryUsersById(database, run.participantIds).observe(),
        progress: observePlaybookRunProgress(database, run.id),
        owner: queryUsersById(database, [run.ownerUserId]).observe().pipe(
            switchMap((users) => (users.length ? users[0].observe() : of$(undefined))),
        ),
        playbookName: observePlaybookName(database, run.playbookId),
    };
});

export {ITEM_HEIGHT as CARD_HEIGHT};
export default withDatabase(enhanced(PlaybookCard));
