// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getCustomEmojisByName} from '@mm-redux/selectors/entities/emojis';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {autocompleteCustomEmojis} from '@mm-redux/actions/emojis';
import {createIdsSelector} from '@mm-redux/utils/helpers';

import {addReactionToLatestPost} from 'app/actions/views/emoji';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {EmojiIndicesByAlias} from 'app/utils/emojis';

import EmojiSuggestion from './emoji_suggestion';

const getEmojisByName = createIdsSelector(
    getCustomEmojisByName,
    (customEmojis) => {
        const emoticons = new Set();
        for (const [key] of [...EmojiIndicesByAlias.entries(), ...customEmojis.entries()]) {
            emoticons.add(key);
        }

        return Array.from(emoticons);
    },
);

function mapStateToProps(state) {
    const emojis = getEmojisByName(state);

    return {
        emojis,
        customEmojisEnabled: getConfig(state).EnableCustomEmoji === 'true',
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReactionToLatestPost,
            autocompleteCustomEmojis,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EmojiSuggestion);
