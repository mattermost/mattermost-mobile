// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigValue} from '@queries/servers/system';

import EditPostInput from './edit_post_input';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    version: observeConfigValue(database, 'Version'),
}));

export default withDatabase(enhanced(EditPostInput));
