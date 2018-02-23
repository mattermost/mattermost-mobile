// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {createSelector} from 'reselect';
import {bindActionCreators} from 'redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCustomEmojisByName} from 'mattermost-redux/selectors/entities/emojis';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getCustomEmojis, searchCustomEmojis} from 'mattermost-redux/actions/emojis';
import {Client4} from 'mattermost-redux/client';

import {incrementEmojiPickerPage} from 'app/actions/views/emoji';
import {getDimensions, isLandscape} from 'app/selectors/device';
import {CategoryNames, Emojis, EmojiIndicesByAlias, EmojiIndicesByCategory} from 'app/utils/emojis';

import EmojiPicker from './emoji_picker';
import Fuse from 'fuse.js';

const categoryToI18n = {
    activity: {
        id: 'mobile.emoji_picker.activity',
        defaultMessage: 'ACTIVITY',
        icon: 'futbol-o',
    },
    custom: {
        id: 'mobile.emoji_picker.custom',
        defaultMessage: 'CUSTOM',
        icon: 'at',
    },
    flags: {
        id: 'mobile.emoji_picker.flags',
        defaultMessage: 'FLAGS',
        icon: 'flag-o',
    },
    foods: {
        id: 'mobile.emoji_picker.foods',
        defaultMessage: 'FOODS',
        icon: 'cutlery',
    },
    nature: {
        id: 'mobile.emoji_picker.nature',
        defaultMessage: 'NATURE',
        icon: 'leaf',
    },
    objects: {
        id: 'mobile.emoji_picker.objects',
        defaultMessage: 'OBJECTS',
        icon: 'lightbulb-o',
    },
    people: {
        id: 'mobile.emoji_picker.people',
        defaultMessage: 'PEOPLE',
        icon: 'smile-o',
    },
    places: {
        id: 'mobile.emoji_picker.places',
        defaultMessage: 'PLACES',
        icon: 'plane',
    },
    recent: {
        id: 'mobile.emoji_picker.recent',
        defaultMessage: 'RECENTLY USED',
        icon: 'clock-o',
    },
    symbols: {
        id: 'mobile.emoji_picker.symbols',
        defaultMessage: 'SYMBOLS',
        icon: 'heart-o',
    },
};

function fillEmoji(indice) {
    const emoji = Emojis[indice];
    return {
        name: emoji.aliases[0],
        aliases: emoji.aliases,
    };
}

const getEmojisBySection = createSelector(
    getCustomEmojisByName,
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
    }
);

const getEmojisByName = createSelector(
    getCustomEmojisByName,
    (customEmojis) => {
        const emoticons = new Set();
        for (const [key] of [...EmojiIndicesByAlias.entries(), ...customEmojis.entries()]) {
            emoticons.add(key);
        }

        return Array.from(emoticons);
    }
);

function mapStateToProps(state) {
    const emojisBySection = getEmojisBySection(state);
    const emojis = getEmojisByName(state);
    const {deviceWidth} = getDimensions(state);
    const options = {
        shouldSort: true,
        threshold: 0.3,
        location: 0,
        distance: 100,
        minMatchCharLength: 2,
        maxPatternLength: 32,
    };

    const list = emojis.length ? emojis : [];
    const fuse = new Fuse(list, options);

    return {
        fuse,
        emojis,
        emojisBySection,
        deviceWidth,
        isLandscape: isLandscape(state),
        theme: getTheme(state),
        customEmojisEnabled: getConfig(state).EnableCustomEmoji === 'true',
        customEmojiPage: state.views.emoji.emojiPickerCustomPage,
        serverVersion: state.entities.general.serverVersion || Client4.getServerVersion(),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getCustomEmojis,
            incrementEmojiPickerPage,
            searchCustomEmojis,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EmojiPicker);
