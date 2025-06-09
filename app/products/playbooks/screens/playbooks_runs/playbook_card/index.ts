// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observePlaybookRunProgress} from '@playbooks/database/queries/run';

import PlaybookCard, {ITEM_HEIGHT} from './playbook_card';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    run: PlaybookRunModel;
} & WithDatabaseArgs;

const enhanced = withObservables(['run'], ({run, database}: OwnProps) => {
    return {
        participants: run.participants().observe(),
        progress: observePlaybookRunProgress(database, run.id),
        owner: run.owner.observe(),
    };
});

export {ITEM_HEIGHT as CARD_HEIGHT};
export default withDatabase(enhanced(PlaybookCard));
