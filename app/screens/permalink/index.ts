// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observePost} from '@queries/servers/post';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {WithDatabaseArgs} from '@typings/database/database';
import PostModel from '@typings/database/models/servers/post';

import Permalink from './permalink';

type OwnProps = {postId: PostModel['id']} & WithDatabaseArgs;

const enhance = withObservables([], ({database, postId}: OwnProps) => {
    const post = observePost(database, postId);

    return {
        channel: post.pipe(
            switchMap((p) => (p ? p.channel.observe() : of$(undefined))),
        ),
        isCRTEnabled: observeIsCRTEnabled(database),
    };
});

export default withDatabase(enhance(Permalink));
