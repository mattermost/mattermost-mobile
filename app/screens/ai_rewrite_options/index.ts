// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/react';

import {withServerUrl} from '@context/server';

import AIRewriteOptions from './ai_rewrite_options';

export default withDatabase(withServerUrl(AIRewriteOptions));

