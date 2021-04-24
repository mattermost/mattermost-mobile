// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getCustomEmojisByName} from '@mm-redux/selectors/entities/emojis';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {Client4} from '@client/rest';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {GlobalState} from '@mm-redux/types/store';

import {BuiltInEmojis, EmojiIndicesByAlias, Emojis} from '@utils/emojis';

import Emoji from './emoji';

type OwnProps = {
    emojiName: string;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const config = getConfig(state);
    const emojiName = ownProps.emojiName;
    const customEmojis = getCustomEmojisByName(state);
    const serverUrl = Client4.getUrl();

    let imageUrl = '';
    let unicode;
    let isCustomEmoji = false;
    let displayTextOnly = false;
    if (EmojiIndicesByAlias.has(emojiName) || BuiltInEmojis.includes(emojiName)) {
        const emoji = Emojis[EmojiIndicesByAlias.get(emojiName)!];
        unicode = emoji.filename;
        if (BuiltInEmojis.includes(emojiName)) {
            if (serverUrl) {
                imageUrl = Client4.getSystemEmojiImageUrl(emoji.filename);
            } else {
                displayTextOnly = true;
            }
        }
    } else if (customEmojis.has(emojiName) && serverUrl) {
        const emoji = customEmojis.get(emojiName);
        imageUrl = Client4.getCustomEmojiImageUrl(emoji!.id);
        isCustomEmoji = true;
    } else {
        displayTextOnly = state.entities.emojis.nonExistentEmoji.has(emojiName) ||
            config.EnableCustomEmoji !== 'true' ||
            config.ExperimentalEnablePostMetadata === 'true' ||
            getCurrentUserId(state) === '' ||
            isMinimumServerVersion(Client4.getServerVersion(), 5, 12);
    }

    return {
        imageUrl,
        isCustomEmoji,
        displayTextOnly,
        unicode,
    };
}

export default connect(mapStateToProps)(Emoji);
