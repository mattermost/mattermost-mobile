// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeUser, observeTeammateNameDisplay, observeCurrentUser} from '@queries/servers/user';

import PermalinkPreview from './permalink_preview';

import type {WithDatabaseArgs} from '@typings/database/database';

type PermalinkPreviewInputProps = WithDatabaseArgs & {
    embedData: PermalinkEmbedData;
};

const enhance = withObservables(['embedData'], ({database, embedData}: PermalinkPreviewInputProps) => {
    const showPermalinkPreviews = observeConfigBooleanValue(database, 'EnableLinkPreviews', false);
    const teammateNameDisplay = observeTeammateNameDisplay(database);

    const author = embedData?.post?.user_id ? observeUser(database, embedData.post.user_id) : of$(undefined);

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

export default withDatabase(enhance(PermalinkPreview));
