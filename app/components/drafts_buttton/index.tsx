// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-nested-callbacks */

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from '@nozbe/watermelondb/utils/rx';
import React from 'react';
import {of as of$} from 'rxjs';

import {observeAllDrafts} from '@app/queries/servers/drafts';
import {observeCurrentChannelId} from '@app/queries/servers/system';

import DraftsButton from './drafts_button';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const allDrafts = observeAllDrafts(database).observeWithColumns(['message', 'files', 'metadata']);
    const files = allDrafts.pipe(switchMap((drafts) => of$(drafts.map((d) => d.files))));
    const messages = allDrafts.pipe(switchMap((drafts) => of$(drafts.map((d) => d.message))));

    return {
        currentChannelId: observeCurrentChannelId(database),
        files,
        messages,
    };
});

export default React.memo(withDatabase(enhanced(DraftsButton)));
