// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {t} from '@utils/i18n';
import {getCustomEmojisByName as selectCustomEmojisByName} from '@mm-redux/selectors/entities/emojis';
import {createIdsSelector} from '@mm-redux/utils/helpers';
import {BuiltInEmojis, CategoryNames, Emojis, EmojiIndicesByAlias, EmojiIndicesByCategory} from '@utils/emojis';

const categoryToI18n = {
    activity: {
        id: t('mobile.emoji_picker.activity'),
        defaultMessage: 'ACTIVITY',
        icon: 'basketball',
    },
    custom: {
        id: t('mobile.emoji_picker.custom'),
        defaultMessage: 'CUSTOM',
        icon: 'emoticon-custom-outline',
    },
    flags: {
        id: t('mobile.emoji_picker.flags'),
        defaultMessage: 'FLAGS',
        icon: 'flag-outline',
    },
    foods: {
        id: t('mobile.emoji_picker.foods'),
        defaultMessage: 'FOODS',
        icon: 'food-apple',
    },
    nature: {
        id: t('mobile.emoji_picker.nature'),
        defaultMessage: 'NATURE',
        icon: 'leaf-outline',
    },
    objects: {
        id: t('mobile.emoji_picker.objects'),
        defaultMessage: 'OBJECTS',
        icon: 'lightbulb-outline',
    },
    people: {
        id: t('mobile.emoji_picker.people'),
        defaultMessage: 'PEOPLE',
        icon: 'emoticon-happy-outline',
    },
    places: {
        id: t('mobile.emoji_picker.places'),
        defaultMessage: 'PLACES',
        icon: 'airplane-variant',
    },
    recent: {
        id: t('mobile.emoji_picker.recent'),
        defaultMessage: 'RECENTLY USED',
        icon: 'clock-outline',
    },
    symbols: {
        id: t('mobile.emoji_picker.symbols'),
        defaultMessage: 'SYMBOLS',
        icon: 'heart-outline',
    },
};

function fillEmoji(indice) {
    const emoji = Emojis[indice];
    return {
        name: emoji.aliases[0],
        aliases: emoji.aliases,
    };
}

export const selectEmojisByName = createIdsSelector(
    selectCustomEmojisByName,
    (customEmojis) => {
        const emoticons = new Set();
        for (const [key] of [...EmojiIndicesByAlias.entries(), ...customEmojis.entries()]) {
            emoticons.add(key);
        }

        return Array.from(emoticons);
    },
);

export const selectEmojisBySection = createSelector(
    selectCustomEmojisByName,
    (state) => state.views.recentEmojis,
    (customEmojis, recentEmojis) => {
        const emoticons = CategoryNames.filter((name) => name !== 'custom').map((category) => {
            const items = EmojiIndicesByCategory.get(category).map(fillEmoji);

            const section = {
                ...categoryToI18n[category],
                key: category,
                data: items,
            };

            return section;
        });

        const customEmojiItems = [];
        BuiltInEmojis.forEach((emoji) => {
            customEmojiItems.push({
                name: emoji,
            });
        });

        for (const [key] of customEmojis) {
            customEmojiItems.push({
                name: key,
            });
        }

        emoticons.push({
            ...categoryToI18n.custom,
            key: 'custom',
            data: customEmojiItems,
        });

        if (recentEmojis.length) {
            const items = recentEmojis.map((emoji) => ({name: emoji}));

            emoticons.unshift({
                ...categoryToI18n.recent,
                key: 'recent',
                data: items,
            });
        }

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
