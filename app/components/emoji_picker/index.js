// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {getCustomEmojisByName} from 'mattermost-redux/selectors/entities/emojis';

import {getTheme} from 'app/selectors/preferences';
import {CategoryNames, Emojis, EmojiIndicesByCategory} from 'app/utils/emojis';

import EmojiPicker from './emoji_picker';

function fillEmoji(indice) {
    return Emojis[indice].aliases[0];
}

const getEmojisByName = createSelector(
    getCustomEmojisByName,
    (customEmojis) => {
        const emoticons = CategoryNames.filter((name) => name !== 'custom').map((category) => {
            const section = {
                title: category.toUpperCase(),
                data: EmojiIndicesByCategory.get(category).map(fillEmoji)
            };

            return section;
        });

        const customEmojisSection = {
            title: 'Custom',
            data: []
        };

        for (const [key] of [...customEmojis]) {
            customEmojisSection.data.push(key);
        }

        emoticons.push(customEmojisSection);

        return emoticons;
    }
);

function mapStateToProps(state) {
    const emojis = getEmojisByName(state);

    return {
        emojis,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(EmojiPicker);
