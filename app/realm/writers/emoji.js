// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';
import {EmojiTypes} from 'app/realm/action_types';

function emojis(realm, action) {
    switch (action.type) {
    case EmojiTypes.RECEIVED_CUSTOM_AND_NON_EXISTENT_EMOJIS: {
        const data = action.data || action.payload;
        const {emoji, nonExistent} = data;
        emoji.forEach((e) => {
            realm.create('Emoji', {id: e.id, name: e.name}, true);
        });

        nonExistent.forEach((n) => {
            realm.create('NonExistentEmoji', n, true);
        });

        break;
    }

    case EmojiTypes.RECEIVED_CUSTOM_EMOJI: {
        const data = action.data || action.payload;
        realm.create('Emoji', {id: data.id, name: data.name}, true);
        break;
    }

    case EmojiTypes.CUSTOM_EMOJI_DOES_NOT_EXIST: {
        const data = action.data || action.payload;
        realm.create('NonExistentEmoji', data, true);
        break;
    }

    default:
        break;
    }
}

export default combineWriters([
    emojis,
]);
