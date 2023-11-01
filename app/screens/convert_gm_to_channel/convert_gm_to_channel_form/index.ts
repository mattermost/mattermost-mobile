// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import {switchMap, distinctUntilChanged} from '@nozbe/watermelondb/utils/rx';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';

import {queryAllCategories} from '@app/queries/servers/categories';
import {observeCurrentUser, observeTeammateNameDisplay} from '@app/queries/servers/user';
import {logDebug} from '@app/utils/log';

import {ConvertGMToChannelForm} from './convert_gm_to_channel_form';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    logDebug('CCCCCCCCCCC');
    const locale = observeCurrentUser(database).pipe(
        switchMap((user) => of$(user?.locale)),
        distinctUntilChanged(),
    );

    const teammateNameDisplay = observeTeammateNameDisplay(database);

    logDebug('AAAAAAAAAAAAAAAAAAAAAA');

    const allCategories = queryAllCategories(database);
    logDebug(allCategories);

    return {
        locale,
        teammateNameDisplay,
    };
});

export default withDatabase(enhanced(ConvertGMToChannelForm));
