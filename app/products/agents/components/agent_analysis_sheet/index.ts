// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeAgentSelectionProps} from '@agents/queries/agents';

import AgentAnalysisSheet, {type AnalysisOption} from './agent_analysis_sheet';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => observeAgentSelectionProps(database));

export type {AnalysisOption};

export default withDatabase(enhanced(AgentAnalysisSheet));
