// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@app/constants/database';
import {withServerDatabase} from '@app/database/components';
import {WithDatabaseArgs} from '@typings/database/database';
import PostModel from '@typings/database/models/servers/post';

const {POST} = MM_TABLES.SERVER;

import Permalink from './permalink';

type OwnProps = {postId: PostModel['id']} & WithDatabaseArgs;

const enhance = withObservables([], ({database, postId}: OwnProps) => {
    const post = database.get<PostModel>(POST).findAndObserve(postId);

    return {
        channel: post.pipe(
            switchMap((p) => p.channel.observe()),
        ),
    };
});

export default compose(
    withServerDatabase,
    withDatabase,
    enhance,
)(Permalink);
