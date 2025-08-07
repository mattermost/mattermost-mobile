// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {withServerUrl} from '@context/server';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeUserOrFetch, observeTeammateNameDisplay, observeCurrentUser} from '@queries/servers/user';

import PermalinkPreview from './permalink_preview';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(['embedData', 'serverUrl'], ({database, embedData, serverUrl}: WithDatabaseArgs & {embedData: PermalinkEmbedData; serverUrl?: string}) => {
    const showPermalinkPreviews = observeConfigBooleanValue(database, 'EnablePermalinkPreviews', false);
    const teammateNameDisplay = observeTeammateNameDisplay(database);

    const userId = embedData?.post?.user_id;
    const author = userId ? observeUserOrFetch(database, serverUrl || '', userId) : of$(undefined);

    const currentUser = observeCurrentUser(database);
    const locale = currentUser.pipe(
        switchMap((u) => of$(u?.locale || 'en')),
        distinctUntilChanged(),
    );

    return {
        showPermalinkPreviews,
        teammateNameDisplay,
        author,
        locale,
    };
});

export default withDatabase(withServerUrl(enhance(PermalinkPreview)));
