// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import AddMembers from './add_members';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM, USER}} = MM_TABLES;

const enhance = withObservables(['post'], ({database, post}: WithDatabaseArgs & {post: PostModel}) => ({
    currentUser: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => database.get(USER).findAndObserve(value)),
    ),
    channelType: post.channel.observe().pipe(
        switchMap(
            (channel: ChannelModel) => (channel ? of$(channel.type) : of$(null)),
        ),
    ),
}));

export default withDatabase(enhance(AddMembers));
