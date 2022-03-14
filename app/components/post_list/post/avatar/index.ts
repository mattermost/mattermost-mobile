// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import enhance from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import Avatar from './avatar';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';

const withPost = enhance(['post'], ({database, post}: {post: PostModel} & WithDatabaseArgs) => {
    const enablePostIconOverride = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap((cfg) => of$(cfg.value.EnablePostIconOverride === 'true')),
    );

    return {
        author: post.author.observe(),
        enablePostIconOverride,
    };
});

export default withDatabase(withPost(Avatar));
