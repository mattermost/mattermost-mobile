// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import {WithDatabaseArgs} from '@typings/database/database';

import Reactor from './reactor';

import type ReactionModel from '@typings/database/models/servers/reaction';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {USER}} = MM_TABLES;

const enhance = withObservables(['reaction'], ({database, reaction}: {reaction: ReactionModel} & WithDatabaseArgs) => {
    const user = database.get<UserModel>(USER).query(
        Q.where('id', reaction.userId),
        Q.take(1),
    ).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );

    return {
        user,
    };
});

export default withDatabase(enhance(Reactor));
