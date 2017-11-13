// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {createSelector} from 'reselect';
import {bindActionCreators} from 'redux';

import {getCustomEmojisByName} from 'mattermost-redux/selectors/entities/emojis';

import {addReactionToLatestPost} from 'app/actions/views/emoji';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {EmojiIndicesByAlias} from 'app/utils/emojis';

import EmojiSuggestion from './emoji_suggestion';

const getEmojisByName = createSelector(
    getCustomEmojisByName,
    (customEmojis) => {
        const emoticons = [];
        for (const [key] of [...EmojiIndicesByAlias.entries(), ...customEmojis.entries()]) {
            emoticons.push(key);
        }

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

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReactionToLatestPost
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EmojiSuggestion);
