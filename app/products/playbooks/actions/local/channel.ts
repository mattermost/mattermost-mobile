// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ChannelModel} from '@database/models/server';

export async function updateLastPlaybookFetchAt(channel: ChannelModel, lastPlaybookFetchAt: number) {
    await channel.update((c) => {
        c.lastPlaybookFetchAt = lastPlaybookFetchAt;
    });
}
