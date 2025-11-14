// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type UserModel from '@typings/database/models/servers/user';

export type SendOptions = {
    inviteAsGuest: boolean;
    includeCustomMessage: boolean;
    customMessage: string;
    selectedChannels: string[];
}

export type EmailInvite = string;

export type SearchResult = UserProfile|UserModel|EmailInvite;

export type InviteResult = {
    userId?: string;
    email?: string;
    reason: string;
};

export type Result = {
    sent: InviteResult[];
    notSent: InviteResult[];
}

export enum TextItemType {
    SEARCH_INVITE = 'search_invite',
    SEARCH_NO_RESULTS = 'search_no_results',
    SUMMARY = 'summary',
}
