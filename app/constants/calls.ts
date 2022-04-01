// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const RefreshConfigMillis = 20 * 60 * 1000; // Refresh config after 20 minutes

const RequiredServer = {
    FULL_VERSION: '6.3.0',
    MAJOR_VERSION: 6,
    MIN_VERSION: 3,
    PATCH_VERSION: 0,
};

export default {RequiredServer, RefreshConfigMillis};
