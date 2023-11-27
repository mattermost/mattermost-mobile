// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observePostAuthor} from '@queries/servers/post';
import {observeConfigBooleanValue} from '@queries/servers/system';

import Avatar from './avatar';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const withPost = withObservables(['post'], ({database, post}: {post: PostModel} & WithDatabaseArgs) => {
    const enablePostIconOverride = observeConfigBooleanValue(database, 'EnablePostIconOverride');

    return {
        author: observePostAuthor(database, post),
        enablePostIconOverride,
    };
});

export default withDatabase(withPost(Avatar));
