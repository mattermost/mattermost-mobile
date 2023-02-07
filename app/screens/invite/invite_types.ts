// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type EmailInvite = string;

export type SearchResult = UserProfile|EmailInvite;

export type Invites = {[id: string]: SearchResult};

export type InviteResult = {
    userId: string;
    reason: string;
};

export type Result = {
    sent: InviteResult[];
    notSent: InviteResult[];
}
