// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observePost} from '@queries/servers/post';
import {observeUser} from '@queries/servers/user';
import {WithDatabaseArgs} from '@typings/database/database';

import Reactor from './reactor';

import type ReactionModel from '@typings/database/models/servers/reaction';

const enhance = withObservables(['reaction'], ({database, reaction}: {reaction: ReactionModel} & WithDatabaseArgs) => ({
    channelId: observePost(database, reaction.postId).pipe(
        switchMap((p) => of$(p?.channelId)),
    ),
    user: observeUser(database, reaction.userId),
}));

export default withDatabase(enhance(Reactor));
