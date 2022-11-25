// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toMilliseconds} from '@utils/datetime';

const RefreshConfigMillis = toMilliseconds({minutes: 20});

const RequiredServer = {
    FULL_VERSION: '6.3.0',
    MAJOR_VERSION: 6,
    MIN_VERSION: 3,
    PATCH_VERSION: 0,
};

const PluginId = 'com.mattermost.calls';

export const REACTION_TIMEOUT = 10000;
export const REACTION_LIMIT = 20;

export default {RequiredServer, RefreshConfigMillis, PluginId, REACTION_TIMEOUT};
