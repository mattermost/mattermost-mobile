// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const RefreshConfigMillis = 20 * 60 * 1000; // Refresh config after 20 minutes

const RequiredServer = {
    FULL_VERSION: '6.3.0',
    MAJOR_VERSION: 6,
    MIN_VERSION: 3,
    PATCH_VERSION: 0,
};

const PluginId = 'com.mattermost.calls';

// Used for case when cloud server is using Calls v0.5.3.
// This can be removed when v0.5.4 is prepackaged in cloud.
const DefaultCloudMaxParticipants = 8;

export default {RequiredServer, RefreshConfigMillis, PluginId, DefaultCloudMaxParticipants};
