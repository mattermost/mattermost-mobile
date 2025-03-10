// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const DRAFT_TYPE_DRAFT = 'draft' as const;
export const DRAFT_TYPE_SCHEDULED = 'scheduled' as const;

export type DraftType = typeof DRAFT_TYPE_DRAFT | typeof DRAFT_TYPE_SCHEDULED;
