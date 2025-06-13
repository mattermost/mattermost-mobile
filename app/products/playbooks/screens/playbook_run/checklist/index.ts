// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';

import Checklist from './checklist';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    checklist: PlaybookChecklistModel | PlaybookChecklist;
} & WithDatabaseArgs;

const enhanced = withObservables(['checklist'], ({checklist}: OwnProps) => {
    if ('observe' in checklist) {
        return {
            checklist: checklist.observe(),
            items: checklist.items.observeWithColumns(['state']),
        };
    }

    return {
        checklist: of$(checklist),
        items: of$(checklist.items),
    };
});

export default withDatabase(enhanced(Checklist));
