// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeUser} from '@queries/servers/user';

import SelectedUserChipById from './selected_user_chip_by_id';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    userId: string;
}

const enhanced = withObservables(['userId'], ({database, userId}: OwnProps) => ({
    user: observeUser(database, userId),
}));

export default withDatabase(enhanced(SelectedUserChipById));
