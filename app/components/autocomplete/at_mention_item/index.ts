// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfig, observeCurrentUserId} from '@queries/servers/system';

import AtMentionItem from './at_mention_item';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = observeConfig(database);
    const isCustomStatusEnabled = config.pipe(
        switchMap((cfg) => of$(cfg?.EnableCustomUserStatuses === 'true')),
    );
    const showFullName = config.pipe(
        switchMap((cfg) => of$(cfg?.ShowFullName === 'true')),
    );
    const currentUserId = observeCurrentUserId(database);
    return {
        isCustomStatusEnabled,
        showFullName,
        currentUserId,
    };
});

export default withDatabase(enhanced(AtMentionItem));
