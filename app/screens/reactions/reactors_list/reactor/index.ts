// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeUser} from '@app/queries/servers/user';
import {WithDatabaseArgs} from '@typings/database/database';

import Reactor from './reactor';

import type ReactionModel from '@typings/database/models/servers/reaction';

const enhance = withObservables(['reaction'], ({database, reaction}: {reaction: ReactionModel} & WithDatabaseArgs) => ({
    user: observeUser(database, reaction.userId),
}));

export default withDatabase(enhance(Reactor));
