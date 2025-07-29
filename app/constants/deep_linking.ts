// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const DeepLinkType = {
    Channel: 'channel',
    DirectMessage: 'dm',
    GroupMessage: 'gm',
    Invalid: 'invalid',
    Permalink: 'permalink',
    Playbooks: 'playbooks',
    PlaybookRuns: 'playbook_runs',
    Redirect: '_redirect',
    Server: 'server',
} as const;

export default DeepLinkType;
