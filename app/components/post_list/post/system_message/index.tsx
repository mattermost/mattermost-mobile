// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';

import SystemMessage from './system_message';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhance = withObservables(['post'], ({post, database}: {post: PostModel} & WithDatabaseArgs) => ({
    author: observeUser(database, post.userId),
    hideGuestTags: observeConfigBooleanValue(database, 'HideGuestTags'),
}));

export default withDatabase(enhance(SystemMessage));
