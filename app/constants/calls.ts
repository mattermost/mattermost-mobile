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

const MultiSessionCallsVersion = {
    FULL_VERSION: '0.21.0',
    MAJOR_VERSION: 0,
    MIN_VERSION: 21,
    PATCH_VERSION: 0,
};

const PluginId = 'com.mattermost.calls';

const REACTION_TIMEOUT = 10000;
const REACTION_LIMIT = 20;
const CALL_QUALITY_RESET_MS = toMilliseconds({minutes: 1});

export enum MessageBarType {
    Microphone,
    CallQuality,
}

export default {
    RefreshConfigMillis,
    RequiredServer,
    MultiSessionCallsVersion,
    PluginId,
    REACTION_TIMEOUT,
    REACTION_LIMIT,
    MessageBarType,
    CALL_QUALITY_RESET_MS,
};
