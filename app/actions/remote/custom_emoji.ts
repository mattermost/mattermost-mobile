// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import FastImage from 'react-native-fast-image';

import {forceLogoutIfNecessary} from '@actions/remote/session';
import emojiStore from '@app/store/emoji_picker';
import {Emoji, General} from '@constants';
import DatabaseManager from '@database/manager';
import {debounce} from '@helpers/api/general';
import NetworkManager from '@managers/network_manager';
import {queryCustomEmojisByName} from '@queries/servers/custom_emoji';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type {Client} from '@app/client/rest';

export const fetchCustomEmojis = async (serverUrl: string, page = 0, perPage = General.PAGE_SIZE_DEFAULT, sort = Emoji.SORT_BY_NAME) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const data = await client.getCustomEmojis(page, perPage, sort);
        await operator.handleCustomEmojis({
            emojis: data,
            prepareRecordsOnly: false,
        });

        return {data};
    } catch (error) {
        logDebug('error on fetchCustomEmojis', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const searchCustomEmojis = async (serverUrl: string, term: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const data = await client.searchCustomEmoji(term);
        if (data.length) {
            const names = data.map((c) => c.name);
            const exist = await queryCustomEmojisByName(database, names).fetch();
            const existingNames = new Set(exist.map((e) => e.name));
            const emojis = data.filter((d) => !existingNames.has(d.name));
            await operator.handleCustomEmojis({
                emojis,
                prepareRecordsOnly: false,
            });
        }
        return {data};
    } catch (error) {
        logDebug('error on searchCustomEmojis', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

const names = new Set<string>();
const debouncedFetchEmojiByNames = debounce(async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const promises: Array<Promise<CustomEmoji>> = [];
        for (const name of names) {
            promises.push(client.getCustomEmojiByName(name));
        }
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
        return {};
    } catch (error) {
        logDebug('error on debouncedFetchEmojiByNames', getFullErrorMessage(error));
        return {error};
    }
}, 200, false, () => {
    names.clear();
});

export const fetchCustomEmojiInBatch = (serverUrl: string, emojiName: string) => {
    names.add(emojiName);
    return debouncedFetchEmojiByNames.apply(null, [serverUrl]);
};

export const getAllCustomEmojis = async (serverUrl: string, page = 0, perPage = General.PAGE_SIZE_DEFAULT, sort = Emoji.SORT_BY_NAME) => {
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

    let hasMore = true;
    let nextPage = page;
    const allEmojis = [];

    do {
        try {
            let emojis = [];
            emojis = await client.getCustomEmojis(nextPage, perPage, sort); // eslint-disable-line no-await-in-loop
            if (emojis.length < perPage) {
                hasMore = false;
            } else {
                nextPage += 1;
            }
            allEmojis.push(...emojis);
        } catch (error) {
            logError('getAllCustomEmojis error', error);
            forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
            return {error};
        }
    } while (hasMore);

    FastImage.preload(allEmojis.map((emoji) => ({
        uri: client.getCustomEmojiImageUrl(emoji.id),
    })));

    await operator.handleCustomEmojis({
        emojis: allEmojis,
        prepareRecordsOnly: false,
    });

    // initialize emoji picker
    emojiStore.initialize(operator.database);

    return {data: allEmojis};
};
