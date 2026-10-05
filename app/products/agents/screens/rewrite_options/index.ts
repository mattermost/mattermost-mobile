// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeAgentSelectionProps} from '@agents/queries/agents';

import RewriteOptions, {type updateValueFn} from './rewrite_options';

import type {WithDatabaseArgs} from '@typings/database/database';

export type {updateValueFn};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => observeAgentSelectionProps(database));

export default withDatabase(enhanced(RewriteOptions));
