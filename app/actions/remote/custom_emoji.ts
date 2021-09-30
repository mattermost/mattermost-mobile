// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logError} from '@actions/remote/error';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import {fetchUsersByIds} from '@actions/remote/user';
import {Client} from '@client/rest';
import {Emoji, General} from '@constants';
import NetworkManager from '@init/network_manager';

export const getCustomEmojis = async (serverUrl: string, page = 0, perPage: number = General.PAGE_SIZE_DEFAULT, sort: string = Emoji.SORT_BY_NAME, loadUsers = false) => {
    let data;
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        data = await client.getCustomEmojis(page, perPage, sort);
        const userIds = data.map((customEmoji) => customEmoji.creator_id);

        if (loadUsers) {
            fetchUsersByIds(serverUrl, userIds);
        }
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        logError(error);
        return {error};
    }

    return {data};
};

