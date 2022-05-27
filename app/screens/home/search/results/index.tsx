// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryPostsById} from '@queries/servers/post';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import Results from './results';

import type {WithDatabaseArgs} from '@typings/database/database';

type enhancedProps = WithDatabaseArgs & {
    postIds: string[];
}

const enhance = withObservables(['postIds'], ({database, postIds}: enhancedProps) => {
    const posts = queryPostsById(database, postIds).observe();
    const currentUser = observeCurrentUser(database);
    return {
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
        isTimezoneEnabled: observeConfigBooleanValue(database, 'ExperimentalTimezone'),
        posts,
    };
});

export default compose(
    withDatabase,
    enhance,
)(Results);

