// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';

import {observeConfigBooleanValue} from '@queries/servers/system';

import Content from './content';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhance = withObservables(['post'], ({database, post}: WithDatabaseArgs & {post: PostModel}) => {
    // The permalink embed is not always first (e.g. agent posts mixing embeds),
    // so scan all embeds like the webapp does.
    const hasPermalinkEmbed = Boolean(post.metadata?.embeds?.some((embed) => embed.type === 'permalink'));
    const showPermalinkPreviews = hasPermalinkEmbed ? observeConfigBooleanValue(database, 'EnablePermalinkPreviews', false) : of$(false);

    return {
        showPermalinkPreviews,
    };
});

export default withDatabase(enhance(Content));
