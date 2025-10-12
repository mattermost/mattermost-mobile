// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeTeammateNameDisplay} from '@queries/servers/user';

import AutoCompleteSelector from './floating_autocomplete_selector';

import type {WithDatabaseArgs} from '@typings/database/database';

const withTeammateNameDisplay = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        teammateNameDisplay: observeTeammateNameDisplay(database),
    };
});

export default withDatabase(withTeammateNameDisplay(AutoCompleteSelector));
