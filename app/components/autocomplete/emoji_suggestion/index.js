// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {createSelector} from 'reselect';
import {bindActionCreators} from 'redux';

import {getCustomEmojisByName} from 'mattermost-redux/selectors/entities/emojis';
import {autocompleteCustomEmojis} from 'mattermost-redux/actions/emojis';
import {Client4} from 'mattermost-redux/client';

import {addReactionToLatestPost} from 'app/actions/views/emoji';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {EmojiIndicesByAlias} from 'app/utils/emojis';

import EmojiSuggestion from './emoji_suggestion';
import Fuse from 'fuse.js';

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
    const options = {
        shouldSort: true,
        threshold: 0.3,
        location: 0,
        distance: 100,
        minMatchCharLength: 2,
        maxPatternLength: 32,
    };

    const emojis = getEmojisByName(state);
    const list = emojis.length ? emojis : [];
    const fuse = new Fuse(list, options);

    return {
        fuse,
        emojis,
        theme: getTheme(state),
        serverVersion: state.entities.general.serverVersion || Client4.getServerVersion(),
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
