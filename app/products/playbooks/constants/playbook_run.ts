// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const PLAYBOOK_RUN_TYPES = {
    PlaybookType: 'playbook' as const,
    ChannelChecklistType: 'channelChecklist' as const,
} as const;

export type PlaybookRunType = typeof PLAYBOOK_RUN_TYPES[keyof typeof PLAYBOOK_RUN_TYPES];
