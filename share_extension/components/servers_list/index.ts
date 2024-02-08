// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';

import {observeAllActiveServers} from '@queries/app/servers';

import ServersList from './servers_list';

const enhanced = withObservables([], () => ({
    servers: observeAllActiveServers(),
}));

export default enhanced(ServersList);
