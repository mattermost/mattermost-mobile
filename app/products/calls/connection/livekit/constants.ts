// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Wire-level constants shared with the calls plugin's webapp client
// (webapp/src/clients/call/constants.ts). These must not drift.

export const USER_ID_SESSION_ID_SEPARATOR = '___';

export const CALL_ATTRIBUTES = {
    RAISED_HAND: 'raised_hand',
} as const;

export const CALL_MESSAGE_TOPICS = {
    REACTION: 'reaction',
} as const;
