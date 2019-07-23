// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from 'app/constants';
import {EmojiIndicesByAlias} from 'app/utils/emojis';
import {parseNeededCustomEmojisFromText} from 'app/utils/emoji_utils';
import {buildPostAttachmentText} from 'app/utils/post';

export function getCustomEmojisForPosts(posts) {
    return async (dispatch, getState) => {
        const realm = getState();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const config = general.config;
        if (config?.EnableCustomEmoji !== 'true') {
            return {data: new Set()};
        }

        if (!posts?.length) {
            return null;
        }

        // If post metadata is supported, custom emojis will have been provided as part of that
        if (posts[0].metadata) {
            return {data: new Set()};
        }

        // TODO: Add compatibility with older servers that do not have metadata enable
        // Maybe by the time we have the realm store we don't want backwards compatibility??

        const nonExistentEmoji = realm.objects('NonExistentEmoji');
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

        const data = Array.from(customEmojisToLoad);

        // allSettle and manage the error??

        return {data};
    };
}
