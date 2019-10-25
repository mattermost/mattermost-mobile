// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import allSettled from 'promise.allsettled';

import {Client4} from 'mattermost-redux/client';

import {General} from 'app/constants';
import {EmojiTypes} from 'app/realm/action_types';
import {EmojiIndicesByAlias} from 'app/utils/emojis';
import {parseNeededCustomEmojisFromText} from 'app/utils/emoji_utils';
import {buildPostAttachmentText} from 'app/utils/post';

import {forceLogoutIfNecessary} from './helpers';

export function getCustomEmojiByName(name: string) {
    return async (dispatch) => {
        let data;
        try {
            data = await Client4.getCustomEmojiByName(name);
        } catch (error) {
            forceLogoutIfNecessary(error);

            if (error.status_code === 404) {
                dispatch({type: EmojiTypes.CUSTOM_EMOJI_DOES_NOT_EXIST, data: name});
            }

            return {error};
        }

        dispatch({
            type: EmojiTypes.RECEIVED_CUSTOM_EMOJI,
            data,
        });

        return {data};
    };
}

export function getCustomEmojisByName(names) {
    return async (dispatch) => {
        if (!names || names.length === 0) {
            return {data: true};
        }

        const promises = [];
        names.forEach((name) => {
            promises.push(Client4.getCustomEmojiByName(name));
        });

        const st = await allSettled(promises);
        const result = st.reduce((r, item) => {
            if (item.status === 'fulfilled') {
                r.emoji.push(item.value);
            } else {
                const segments = item.reason.url.split('/');
                const name = segments[segments.length - 1];
                r.nonExistent.push(name);
            }

            return r;
        }, {emoji: [], nonExistent: []});

        dispatch({
            type: EmojiTypes.RECEIVED_CUSTOM_AND_NON_EXISTENT_EMOJIS,
            data: result,
        });

        return {data: result.emoji};
    };
}

export function getCustomEmojisForPosts(posts) {
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const config = general.config;

        if (config?.EnableCustomEmoji !== 'true') {
            return {data: []};
        }

        if (!posts?.length) {
            return null;
        }

        // If post metadata is supported, custom emojis will have been provided as part of that
        if (posts[0].metadata) {
            return {data: []};
        }

        const nonExistentEmoji = realm.objects('NonExistentEmoji').map((n) => n);
        const customEmojisByName = realm.objects('Emoji').map((emoji) => emoji.name);
        const systemEmojis = Array.from(EmojiIndicesByAlias.keys());

        let customEmojisToLoad = new Set();
        posts.forEach((post) => {
            if (post.message.includes(':')) {
                const emojisFromPost = parseNeededCustomEmojisFromText(post.message, systemEmojis, customEmojisByName, nonExistentEmoji);

                if (emojisFromPost.length) {
                    customEmojisToLoad = new Set([...customEmojisToLoad, ...emojisFromPost]);
                }
            }

            const props = post.props;
            if (props && props.attachments && props.attachments.length) {
                const attachmentText = buildPostAttachmentText(props.attachments);

                if (attachmentText) {
                    const emojisFromAttachment = parseNeededCustomEmojisFromText(attachmentText, systemEmojis, customEmojisByName, nonExistentEmoji);

                    if (emojisFromAttachment.length) {
                        customEmojisToLoad = new Set([...customEmojisToLoad, ...emojisFromAttachment]);
                    }
                }
            }
        });

        return dispatch(getCustomEmojisByName(Array.from(customEmojisToLoad)));
    };
}

export function getCustomEmojisInText(text) {
    return async (dispatch, getState) => {
        if (!text) {
            return {data: true};
        }

        const realm = getState();
        const nonExistentEmoji = realm.objects('NonExistentEmoji').map((n) => n);
        const customEmojisByName = realm.objects('Emoji').map((emoji) => emoji.name);
        const systemEmojis = Array.from(EmojiIndicesByAlias.keys());

        const emojisToLoad = parseNeededCustomEmojisFromText(text, systemEmojis, customEmojisByName, nonExistentEmoji);

        return getCustomEmojisByName(Array.from(emojisToLoad))(dispatch, getState);
    };
}
