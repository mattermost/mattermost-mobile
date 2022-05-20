// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function makeCategoryChannelId(teamId: string, channelId: string) {
    return `${teamId}_${channelId}`;
}
