// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeIsAgentsAnalysisLicensed} from '@agents/queries/license';

import AskAgentsOption from './ask_agents_option';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    isAnalysisLicensed: observeIsAgentsAnalysisLicensed(database),
}));

export default withDatabase(enhanced(AskAgentsOption));
