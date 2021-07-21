// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

//todo: There will be an updated method soon.  Please update it.
export function getUserIdFromChannelName(userId: string, channelName: string): string {
    const ids = channelName.split('__');
    if (ids[0] === userId) {
        return ids[1];
    }
    return ids[0];
}
