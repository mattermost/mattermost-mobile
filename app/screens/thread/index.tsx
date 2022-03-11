// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Database} from '@constants';

import Thread from './thread';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const {MM_TABLES} = Database;
const {SERVER: {POST}} = MM_TABLES;

const enhanced = withObservables(['rootId'], ({database, rootId}: WithDatabaseArgs & {rootId: string}) => {
    return {
        rootPost: database.get<PostModel>(POST).query(
            Q.where('id', rootId),
        ).observe().pipe(
            switchMap((posts) => posts[0]?.observe() || of$(undefined)),
        ),
    };
});

export default withDatabase(enhanced(Thread));
