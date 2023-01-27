// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {Emoji, General} from '@constants';
import DatabaseManager from '@database/manager';
import {debounce} from '@helpers/api/general';
import NetworkManager from '@managers/network_manager';
import {queryCustomEmojisByName} from '@queries/servers/custom_emoji';

import type {Client} from '@client/rest';

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

const names = new Set<string>();
const debouncedFetchEmojiByNames = debounce(async (serverUrl: string) => {
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

    const promises: Array<Promise<CustomEmoji>> = [];
    for (const name of names) {
        promises.push(client.getCustomEmojiByName(name));
    }

    try {
        const emojisResult = await Promise.allSettled(promises);
        const emojis = emojisResult.reduce<CustomEmoji[]>((result, e) => {
            if (e.status === 'fulfilled') {
                result.push(e.value);
            }
            return result;
        }, []);
        if (emojis.length) {
            await operator.handleCustomEmojis({emojis, prepareRecordsOnly: false});
        }
        return {error: undefined};
    } catch (error) {
        return {error};
    }
}, 200, false, () => {
    names.clear();
});

export const fetchCustomEmojiInBatch = (serverUrl: string, emojiName: string) => {
    names.add(emojiName);
    return debouncedFetchEmojiByNames.apply(null, [serverUrl]);
};
