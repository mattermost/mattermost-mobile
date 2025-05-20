// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import Checklist from './checklist';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    checklist: PlaybookChecklistModel;
} & WithDatabaseArgs;

const enhanced = withObservables(['checklist'], ({checklist}: OwnProps) => {
    return {
        items: checklist.items.observe(),
    };
});

export default withDatabase(enhanced(Checklist));
