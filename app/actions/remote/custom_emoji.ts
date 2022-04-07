// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {Client} from '@client/rest';
import {Emoji, General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryCustomEmojisByName} from '@queries/servers/custom_emoji';

export const fetchCustomEmojis = async (serverUrl: string, page = 0, perPage = General.PAGE_SIZE_DEFAULT, sort = Emoji.SORT_BY_NAME) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const data = await client.getCustomEmojis(page, perPage, sort);
        await operator.handleCustomEmojis({
            emojis: data,
            prepareRecordsOnly: false,
        });

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const searchCustomEmojis = async (serverUrl: string, term: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const data = await client.searchCustomEmoji(term);
        if (data.length) {
            const names = data.map((c) => c.name);
            const exist = await queryCustomEmojisByName(operator.database, names).fetch();
            const existingNames = new Set(exist.map((e) => e.name));
            const emojis = data.filter((d) => !existingNames.has(d.name));
            await operator.handleCustomEmojis({
                emojis,
                prepareRecordsOnly: false,
            });
        }
        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
