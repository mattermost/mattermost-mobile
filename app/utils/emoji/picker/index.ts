// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {chunk} from 'lodash';

import {Device} from '@app/constants';
import {CategoryNames, EmojiIndicesByAlias, EmojiIndicesByCategory} from '@app/utils/emoji';
import {fillEmoji} from '@app/utils/emoji/helpers';

import type {EmojiCategoryType, EmojiRowType} from '@app/store/emoji_picker/interface';

const EMOJIS_PER_ROW = 7;
const EMOJIS_PER_ROW_TABLET = 9;

const emptyEmoji: EmojiAlias = {
    name: '',
    short_name: '',
    aliases: [],
};

const buildCustomSectionRows = (data: EmojiAlias[]) => {
    return data.map((item) => ({
        aliases: [],
        name: item.name,
        short_name: '',
    }));
};

const buildRecentSectionRows = (recentEmojis: string[], customEmojis: any[]) => {
    if (!recentEmojis?.length) {
        return [];
    }

    return recentEmojis.map((item: string) => {
        const alias = EmojiIndicesByAlias.get(item);
        const isCustomEmoji = customEmojis.find((emoji) => emoji.name === item);
        if (alias) {
            return fillEmoji('recent', alias);
        } else if (isCustomEmoji) {
            return {
                aliases: [],
                name: item,
                short_name: '',
            };
        }
        return null;
    }).filter((item: any) => item !== null);
};

export const buildEmojiSections = (customEmojis: any[], recentEmojis: any[]) => {
    const isTablet = Device.IS_TABLET;
    const emojisPerRow = isTablet ? EMOJIS_PER_ROW_TABLET : EMOJIS_PER_ROW;
    const emojiBySections: EmojiRowType[] = [];
    const categoryBySections: EmojiCategoryType[] = [];

    CategoryNames.forEach((category) => {
        const emojiIndices = EmojiIndicesByCategory.get('default')?.get(category);
        let data;

        switch (category) {
            case 'custom': {
                data = buildCustomSectionRows(customEmojis);
                break;
            }
            case 'recent': {
                data = buildRecentSectionRows(recentEmojis, customEmojis);
                break;
            }
            default:
                data = emojiIndices.map(fillEmoji.bind(null, category));
                break;
        }

        if (data.length > 0) {
            const categoryItem: EmojiCategoryType = {
                key: category,
                index: emojiBySections.length > 0 ? emojiBySections.length - 1 : 0,
            };

            emojiBySections.push(categoryItem);
            categoryBySections.push(categoryItem);

            const sections = chunk<EmojiAlias>(data, emojisPerRow);

            sections?.forEach((d) => {
                if (d.length < emojisPerRow) {
                    d.push(
                        ...(new Array(emojisPerRow - d.length).fill(emptyEmoji)),
                    );
                }
                emojiBySections.push(d);
            });
        }
    });

    return {
        sections: emojiBySections,
        categories: categoryBySections,
    };
};

export const isCategoryItem = (item: any) => 'key' in item;
