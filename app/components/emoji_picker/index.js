// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {getCustomEmojisByName} from 'mattermost-redux/selectors/entities/emojis';

import {getDimensions} from 'app/selectors/device';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {CategoryNames, Emojis, EmojiIndicesByCategory} from 'app/utils/emojis';

import EmojiPicker from './emoji_picker';

const categoryToI18n = {
    activity: {
        id: 'mobile.emoji_picker.activity',
        defaultMessage: 'ACTIVITY'
    },
    custom: {
        id: 'mobile.emoji_picker.custom',
        defaultMessage: 'CUSTOM'
    },
    flags: {
        id: 'mobile.emoji_picker.flags',
        defaultMessage: 'FLAGS'
    },
    foods: {
        id: 'mobile.emoji_picker.foods',
        defaultMessage: 'FOODS'
    },
    nature: {
        id: 'mobile.emoji_picker.nature',
        defaultMessage: 'NATURE'
    },
    objects: {
        id: 'mobile.emoji_picker.objects',
        defaultMessage: 'OBJECTS'
    },
    people: {
        id: 'mobile.emoji_picker.people',
        defaultMessage: 'PEOPLE'
    },
    places: {
        id: 'mobile.emoji_picker.places',
        defaultMessage: 'PLACES'
    },
    symbols: {
        id: 'mobile.emoji_picker.symbols',
        defaultMessage: 'SYMBOLS'
    }
};

function fillEmoji(indice) {
    const emoji = Emojis[indice];
    return {
        name: emoji.aliases[0],
        aliases: emoji.aliases
    };
}

const getEmojisBySection = createSelector(
    getCustomEmojisByName,
    (customEmojis) => {
        const emoticons = CategoryNames.filter((name) => name !== 'custom').map((category) => {
            const section = {
                ...categoryToI18n[category],
                key: category,
                data: [{
                    key: `${category}-emojis`,
                    items: EmojiIndicesByCategory.get(category).map(fillEmoji)
                }]
            };

            return section;
        });

        const customEmojiData = {
            key: 'custom-emojis',
            title: 'CUSTOM',
            items: []
        };

        for (const [key] of customEmojis) {
            customEmojiData.items.push({
                name: key
            });
        }

        emoticons.push({
            ...categoryToI18n.custom,
            key: 'custom',
            data: [customEmojiData]
        });

        return emoticons;
    }
);

function mapStateToProps(state) {
    const emojis = getEmojisBySection(state);
    const {deviceWidth} = getDimensions(state);

    return {
        emojis,
        deviceWidth,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(EmojiPicker);
