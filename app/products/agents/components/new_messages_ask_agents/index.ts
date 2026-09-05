// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeHasAgents} from '@agents/queries/agents';
import {observeIsAgentsAnalysisLicensed} from '@agents/queries/license';
import {withServerUrl} from '@context/server';

import NewMessagesAskAgents from './new_messages_ask_agents';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    serverUrl: string;
};

const enhanced = withObservables([], ({database, serverUrl}: EnhancedProps) => ({
    isAnalysisLicensed: observeIsAgentsAnalysisLicensed(database),
    hasAgents: observeHasAgents(serverUrl),
}));

export default React.memo(withDatabase(withServerUrl(enhanced(NewMessagesAskAgents))));
