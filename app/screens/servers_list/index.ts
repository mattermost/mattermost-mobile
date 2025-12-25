// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';

import {observeServersByIds} from '@queries/app/servers';

import ServersList from './servers_list';

export type ServersListProps = {
    serverIds: string[];
}

const enhance = withObservables(['serverIds'], ({serverIds}: ServersListProps) => {
    return {
        servers: observeServersByIds(serverIds),
    };
});

export default enhance(ServersList);
