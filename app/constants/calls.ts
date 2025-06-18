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

const HostControlsCallsVersion = {
    FULL_VERSION: '0.27.0',
    MAJOR_VERSION: 0,
    MIN_VERSION: 27,
    PATCH_VERSION: 0,
};

const PluginId = 'com.mattermost.calls';

const REACTION_TIMEOUT = 10000;
const REACTION_LIMIT = 20;
const CALL_QUALITY_RESET_MS = toMilliseconds({minutes: 1});
const CAPTION_TIMEOUT = 5000;
const RING_LENGTH = 30000;

export enum Ringtone {
    Calm = 'Calm',
    Dynamic = 'Dynamic',
    Urgent = 'Urgent',
    Cheerful = 'Cheerful',
}

const RINGTONE_DEFAULT = Ringtone.Calm;

// 30 seconds of vibration (there is no loop setting)
const RINGTONE_VIBRATE_PATTERN = [1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000, 1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000, 1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000, 1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000, 1000, 500, 1000, 500, 1000];

export enum MessageBarType {
    Microphone,
    CallQuality,
}

// The JobTypes from calls plugin's server/public/job.go
const JOB_TYPE_RECORDING = 'recording';
const JOB_TYPE_TRANSCRIBING = 'transcribing';
const JOB_TYPE_CAPTIONING = 'captioning';

export default {
    RefreshConfigMillis,
    RequiredServer,
    HostControlsCallsVersion,
    PluginId,
    REACTION_TIMEOUT,
    REACTION_LIMIT,
    MessageBarType,
    CALL_QUALITY_RESET_MS,
    CAPTION_TIMEOUT,
    JOB_TYPE_RECORDING,
    JOB_TYPE_TRANSCRIBING,
    JOB_TYPE_CAPTIONING,
    RING_LENGTH,
    RINGTONE_DEFAULT,
    RINGTONE_VIBRATE_PATTERN,
};
