// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {queryUsersById} from '@queries/servers/user';

import Participants from './participants';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    participantIds: string[];
}

const enhanced = withObservables(['participantIds'], ({database, participantIds}: Props) => {
    return {
        users: queryUsersById(database, participantIds).observe(),
    };
});

export default withDatabase(enhanced(Participants));
