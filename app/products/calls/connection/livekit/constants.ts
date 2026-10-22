// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Wire-level constants shared with the calls plugin's webapp client
// (webapp/src/clients/call/constants.ts). These must not drift.

export const USER_ID_SESSION_ID_SEPARATOR = '___';

export const CALL_ATTRIBUTES = {
    RAISED_HAND: 'raised_hand',

    // Server-set on the recording/transcribing bot's token grant, so the bot can be
    // kept out of the participant list however it is discovered.
    BOT: 'bot',
} as const;

export const CALL_MESSAGE_TOPICS = {
    REACTION: 'reaction',
} as const;
