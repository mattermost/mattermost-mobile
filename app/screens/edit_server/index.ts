// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';

import {observeServerById} from '@queries/app/servers';

import EditServer from './edit_server';

export type EditServerProps = {
    serverId: string;
    theme: Theme;
};

const enhanced = withObservables(['serverId'], ({serverId}: EditServerProps) => ({
    server: observeServerById(serverId),
}));

export default enhanced(EditServer);
