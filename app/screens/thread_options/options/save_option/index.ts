// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import SaveOption from './save_option';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(['threadId'], ({threadId, database}: WithDatabaseArgs & {threadId: string}) => {
    return {
        isSaved: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SAVED_POST, threadId).observe().pipe(
            switchMap(
                (pref) => of$(Boolean(pref[0]?.value === 'true')),
            ),
        ),
    };
});

export default withDatabase(enhanced(SaveOption));
