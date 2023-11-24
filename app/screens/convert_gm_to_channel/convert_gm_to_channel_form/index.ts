// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap, distinctUntilChanged} from '@nozbe/watermelondb/utils/rx';
import {of as of$} from 'rxjs';

import {observeCurrentUser, observeTeammateNameDisplay} from '@queries/servers/user';

import {ConvertGMToChannelForm} from './convert_gm_to_channel_form';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const locale = observeCurrentUser(database).pipe(
        switchMap((user) => of$(user?.locale)),
        distinctUntilChanged(),
    );

    const teammateNameDisplay = observeTeammateNameDisplay(database);

    return {
        locale,
        teammateNameDisplay,
    };
});

export default withDatabase(enhanced(ConvertGMToChannelForm));
