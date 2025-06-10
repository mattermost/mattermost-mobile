// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const DRAFT_TYPE_DRAFT = 'draft' as const;
export const DRAFT_TYPE_SCHEDULED = 'scheduled' as const;

export type DraftType = typeof DRAFT_TYPE_DRAFT | typeof DRAFT_TYPE_SCHEDULED;

export const DRAFT_SCHEDULED_POST_LAYOUT_PADDING = 40;

export const DRAFT_SCREEN_TAB_DRAFTS = 'drafts' as const;
export const DRAFT_SCREEN_TAB_SCHEDULED_POSTS = 'scheduled_posts' as const;
export type DraftScreenTab = typeof DRAFT_SCREEN_TAB_DRAFTS | typeof DRAFT_SCREEN_TAB_SCHEDULED_POSTS;
