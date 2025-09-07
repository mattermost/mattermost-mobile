// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';

import {observeConfigBooleanValue} from '@queries/servers/system';

import Content from './content';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhance = withObservables(['post'], ({database, post}: WithDatabaseArgs & {post: PostModel}) => {
    const hasPermalinkEmbed = post.metadata?.embeds?.[0]?.type === 'permalink';
    const showPermalinkPreviews = hasPermalinkEmbed ? observeConfigBooleanValue(database, 'EnablePermalinkPreviews', false) : of$(false);

    return {
        showPermalinkPreviews,
    };
});

export default withDatabase(enhance(Content));
