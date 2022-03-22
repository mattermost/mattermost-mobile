// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';

import Reactions from './reactions';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type EnhancedProps = WithDatabaseArgs & {
    postId: string;
}

const {POST} = MM_TABLES.SERVER;

const enhanced = withObservables([], ({postId, database}: EnhancedProps) => {
    const post = database.get<PostModel>(POST).findAndObserve(postId);

    return {
        reactions: post.pipe(
            switchMap((p) => p.reactions.observe()),
        ),
    };
});

export default withDatabase(enhanced(Reactions));

