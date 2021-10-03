// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {queryAllCustomEmojis} from '@queries/servers/custom_status';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {queryConfig} from '@queries/servers/system';
import SystemModel from '@typings/database/models/servers/system';
import {Emojis, EmojiIndicesByAlias, CategoryNames, EmojiIndicesByCategory, CategoryTranslations, CategoryMessage} from '@utils/emoji';
import {isCustomEmojiEnabled} from '@utils/emoji/helpers';

import type Database from '@nozbe/watermelondb/Database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type PreferenceModel from '@typings/database/models/servers/preference';

type EmojiDetails = {
    name: string;
    skins: string[];
    [x: string]: any;
};

type CategoryTranslation = {
    id?: string;
    defaultMessage: string;
    icon: string;
}

const ICONS: Record<string, string> = {
    recent: 'clock-outline',
    'smileys-emotion': 'emoticon-happy-outline',
    'people-body': 'eye-outline',
    'animals-nature': 'leaf-outline',
    'food-drink': 'food-apple',
    'travel-places': 'airplane-variant',
    activities: 'basketball',
    objects: 'lightbulb-outline',
    symbols: 'heart-outline',
    flags: 'flag-outline',
    custom: 'emoticon-custom-outline',
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

export const getCustomEmojis = async (database: Database): Promise<CustomEmojiModel[]> => {
    try {
        const config: ClientConfig = await queryConfig(database);
        if (!isCustomEmojiEnabled(config)) {
            return [];
        }
        const customEmojis = (await queryAllCustomEmojis(database)) as unknown as CustomEmojiModel[];
        return customEmojis;
    } catch (e) {
        return [];
    }
};

const categoryToI18n: Record<string, CategoryTranslation> = {};
CategoryNames.forEach((name: string) => {
    categoryToI18n[name] = {
        id: CategoryTranslations.get(name),
        defaultMessage: CategoryMessage.get(name),
        icon: ICONS[name],
    };
});

function fillEmoji(indice: number) {
    const emoji = Emojis[indice];
    return {
        name: 'short_name' in emoji ? emoji.short_name : emoji.name,
        aliases: 'short_names' in emoji ? emoji.short_names : [],
    };
}

export const getEmojisByName = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const skinToneRecord = (await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_EMOJI, Preferences.EMOJI_SKINTONE)) as unknown as PreferenceModel[];
        const skinTone = skinToneRecord?.[0]?.value ?? 'default';

        const customEmojis = await getCustomEmojis(database);

        const emoticons = new Set();

        for (const [key, index] of EmojiIndicesByAlias.entries()) {
            const skin = getSkin(Emojis[index]);
            if (!skin || skin === skinTone) {
                emoticons.add(key);
            }
        }

        if (customEmojis) {
            customEmojis.map((cs) => {
                return emoticons.add(cs.name);
            });
        }

        return {data: Array.from(emoticons)};
    } catch (error) {
        return {error};
    }
};

export const selectEmojisBySection = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;

    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const customEmojiRecords = await getEmojisByName(serverUrl);
        const recentEmojiRecords = await database.get(MM_TABLES.SERVER.SYSTEM).query(Q.where('id', SYSTEM_IDENTIFIERS.RECENT_REACTIONS)).fetch() as SystemModel[];
        const skinToneRecords = (await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_EMOJI, Preferences.EMOJI_SKINTONE)) as unknown as PreferenceModel[];

        const skinTone = skinToneRecords?.[0]?.value ?? 'default';
        const recentEmojis = recentEmojiRecords?.[0]?.value as string[] ?? [];
        const customEmojis = customEmojiRecords?.data as string[] ?? [];

        const customEmojiItems = customEmojis.map((emoji) => ({name: emoji}));
        const recentItems = recentEmojis.map((emoji) => ({name: emoji}));

        const filteredCategories = CategoryNames.filter((category) => category !== 'recent' || recentItems.length > 0);

        const emoticons = filteredCategories.map((category) => {
            const data = EmojiIndicesByCategory.get(skinTone)!.get(category).map(fillEmoji);

            if (category === 'custom') {
                data.push(...customEmojiItems);
            } else if (category === 'recent') {
                data.push(...recentItems);
            }

            const section = {
                ...categoryToI18n[category],
                key: category,
                data,
            };

            return section;
        });

        return {emoticons, emojis: customEmojis};
    } catch (error) {
        return {error};
    }
};
