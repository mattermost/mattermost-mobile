// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import FollowOption from './follow_option';

import type PostModel from '@typings/database/models/servers/post';

const enhanced = withObservables(['post'], ({post}: {post: PostModel}) => {
    return {
        teamId: post.channel.observe().pipe(
            switchMap((channel) => of$(channel?.teamId)),
        ),
    };
});

export default enhanced(FollowOption);
