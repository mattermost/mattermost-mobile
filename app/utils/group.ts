// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function makeGroupMembershipId(groupId: string, userId: string) {
    return `${groupId}_${userId}`;
}
