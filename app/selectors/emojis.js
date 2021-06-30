// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {getCustomEmojisByName as selectCustomEmojisByName} from '@mm-redux/selectors/entities/emojis';
import {createIdsSelector} from '@mm-redux/utils/helpers';
import {CategoryNames, CategoryTranslations, Emojis, EmojiIndicesByAlias, EmojiIndicesByCategory, CategoryMessage} from '@utils/emojis';

const icons = {
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

const categoryToI18n = {};
CategoryNames.forEach((name) => {
    categoryToI18n[name] = {
        id: CategoryTranslations.get(name),
        defaultMessage: CategoryMessage.get(name),
        icon: icons[name],
    };
});

function fillEmoji(indice) {
    const emoji = Emojis[indice];
    return {
        name: 'short_name' in emoji ? emoji.short_name : emoji.name,
        aliases: 'short_names' in emoji ? emoji.short_names : [],
    };
}

export const selectEmojisByName = createIdsSelector(
    selectCustomEmojisByName,
    (customEmojis) => {
        const emoticons = new Set();
        for (const [key] of [...EmojiIndicesByAlias.entries(), ...customEmojis.entries()]) {
            if (!key.includes('skin_tone')) {
                emoticons.add(key);
            }
        }

        return Array.from(emoticons);
    },
);

export const selectEmojisBySection = createSelector(
    selectCustomEmojisByName,
    (state) => state.views.recentEmojis,
    (customEmojis, recentEmojis) => {
        const customEmojiItems = [];
        for (const [key] of customEmojis) {
            customEmojiItems.push({
                name: key,
            });
        }
        const recentItems = recentEmojis.map((emoji) => ({name: emoji}));
        const filteredCategories = CategoryNames.filter((category) => category !== 'recent' || recentItems.length > 0);

        const emoticons = filteredCategories.map((category) => {
            // TODO: change default into user selected category once the user is able to choose it
            const items = EmojiIndicesByCategory.get('default').get(category).map(fillEmoji);
            const data = items;
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

        return emoticons;
    },
);

export const selectEmojisCountFromReactions = createSelector(
    (reactions) => reactions,
    (reactions) => {
        if (reactions) {
            const names = Object.values(reactions).map((r) => r.emoji_name);
            const diff = new Set(names);
            return diff.size;
        }

        return 0;
    },
);
