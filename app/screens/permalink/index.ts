// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@app/constants/database';
import {WithDatabaseArgs} from '@typings/database/database';
import PostModel from '@typings/database/models/servers/post';

const {POST} = MM_TABLES.SERVER;

import Permalink from './permalink';

type OwnProps = {postId: PostModel['id']} & WithDatabaseArgs;

const enhance = withObservables([], ({database, postId}: OwnProps) => {
    const post = database.get<PostModel>(POST).query(
        Q.where('id', postId),
    ).observe().pipe(
        switchMap((p) => {
            return p.length ? p[0].observe() : of$(undefined);
        }),
    );

    return {
        channel: post.pipe(
            switchMap((p) => (p ? p.channel.observe() : of$(undefined))),
        ),
    };
});

export default withDatabase(enhance(Permalink));
