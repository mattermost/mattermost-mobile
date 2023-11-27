// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeIsCustomStatusExpirySupported} from '@queries/servers/system';

import CustomStatusSuggestion from './custom_status_suggestion';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        isExpirySupported: observeIsCustomStatusExpirySupported(database),
    };
});

export default withDatabase(enhanced(CustomStatusSuggestion));
