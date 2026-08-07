// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeHasAgents} from '@agents/queries/agents';
import {observeIsAgentsAnalysisLicensed} from '@agents/queries/license';
import {withServerUrl} from '@context/server';

import AskAgentsOption from './ask_agents_option';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    serverUrl: string;
};

const enhanced = withObservables([], ({database, serverUrl}: EnhancedProps) => ({

    // The plugin 403s channel analysis on unlicensed servers (unless the
    // server runs in development mode), and with zero usable agents every
    // path through the sheet dead-ends — hide the entry point for both.
    isAnalysisLicensed: observeIsAgentsAnalysisLicensed(database),
    hasAgents: observeHasAgents(serverUrl),
}));

export default React.memo(withDatabase(withServerUrl(enhanced(AskAgentsOption))));
