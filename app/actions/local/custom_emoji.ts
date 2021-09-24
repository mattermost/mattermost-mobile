// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {queryAllCustomEmojis} from '@queries/servers/custom_status';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {queryCommonSystemValues} from '@queries/servers/system';
import CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import PreferenceModel from '@typings/database/models/servers/preference';
import {Emojis, EmojiIndicesByAlias} from '@utils/emoji';

type EmojiDetails = {
    name: string;
    skins: string[];
    [x: string]: any;
};

// if an emoji
// - has `skin_variations` then it uses the default skin (yellow)
// - has `skins` it's first value is considered the skin version (it can contain more values)
// - any other case it doesn't have variations or is a custom emoji.
const getSkin = (emoji: EmojiDetails) => {
    if ('skin_variations' in emoji) {
        return 'default';
    }

    if ('skins' in emoji) {
        return emoji.skins && emoji.skins[0];
    }

    return null;
};

export const getCustomEmojis = async (database: Database) => {
    try {
        const systemValues = await queryCommonSystemValues(database);

        if (systemValues.config.EnableCustomEmoji !== 'true') {
            return {};
        }

        const customEmojis = (await queryAllCustomEmojis(database)) as unknown as CustomEmojiModel[];

        return {customEmojis};
    } catch (error) {
        return {error};
    }
};

export const getEmojisByName = async (serverUrl: string) => {
    let skinTone;

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const skinToneRecord = (await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_EMOJI, Preferences.EMOJI_SKINTONE)) as unknown as PreferenceModel[];
        skinTone = skinToneRecord?.[0]?.value;
        if (!skinTone) {
            skinTone = 'default';
        }

        const {customEmojis} = await getCustomEmojis(database);

        const emoticons = new Set();

        for (const [key, index] of EmojiIndicesByAlias.entries()) {
            const skin = getSkin(Emojis[index]);
            if (!skin || skin === skinTone) {
                emoticons.add(key);
            }
        }

        if (customEmojis) {
            customEmojis.map((cs) => emoticons.add(cs.name));
        }

        return {data: Array.from(emoticons)};
    } catch (error) {
        return {error};
    }
};
