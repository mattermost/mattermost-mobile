// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/react';

import AgentThreadsList from './agent_threads_list';

export default withDatabase(AgentThreadsList);
