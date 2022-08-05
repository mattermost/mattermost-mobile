// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const DeepLinkType = {
    Channel: 'channel',
    DirectMessage: 'dm',
    GroupMessage: 'gm',
    Invalid: 'invalid',
    Permalink: 'permalink',
    Plugin: 'plugin',
} as const;

export default DeepLinkType;
