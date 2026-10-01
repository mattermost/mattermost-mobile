// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeAIBots} from '@agents/database/queries/bot';
import {observeSelectedAgentId} from '@agents/queries/agents';

import AgentAnalysisSheet, {type AnalysisOption} from './agent_analysis_sheet';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    bots: observeAIBots(database),
    selectedAgentId: observeSelectedAgentId(database),
}));

export type {AnalysisOption};

export default withDatabase(enhanced(AgentAnalysisSheet));
