// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logError} from '@actions/remote/error';
import {forceLogoutIfNecessary} from '@actions/remote/session';
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
        console.log('>>>  getCustomEmojis', JSON.stringify(data));
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        logError(error);
        return {error};
    }

    //fixme: fix the below code
    // if (loadUsers) {
    //     dispatch(loadProfilesForCustomEmojis(data));
    // }
    //
    // dispatch({
    //     type: EmojiTypes.RECEIVED_CUSTOM_EMOJIS,
    //     data,
    // });

    return {data};
};

