// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {from as from$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeFilesForPost} from '@queries/servers/file';
import {filesLocalPathValidation} from '@utils/file';

import EditOption from './edit_option';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type Props = WithDatabaseArgs & {
    post: PostModel;
}

const enhance = withObservables(['post'], ({post, database}: Props) => {
    const files = observeFilesForPost(database, post.id).pipe(
        switchMap((fs) => from$(filesLocalPathValidation(fs, post.userId))),
    );

    return {
        files,
    };
});

export default withDatabase(enhance(EditOption));
