// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfig} from '@queries/servers/system';

import EditPostInput from './edit_post_input';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    config: observeConfig(database),
}));

export default withDatabase(enhanced(EditPostInput));
