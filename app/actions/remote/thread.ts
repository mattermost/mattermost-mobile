// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToThread} from '@actions/local/thread';
import {fetchPostThread} from '@actions/remote/post';

export const fetchAndSwitchToThread = async (serverUrl: string, rootId: string) => {
    // Load thread before we open to the thread modal
    // https://mattermost.atlassian.net/browse/MM-42232
    fetchPostThread(serverUrl, rootId);

    switchToThread(serverUrl, rootId);
};
