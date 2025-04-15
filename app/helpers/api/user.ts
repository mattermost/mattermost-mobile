// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import {MENTIONS_REGEX} from '@constants/autocomplete';
import {isMessageAttachmentArray} from '@utils/message_attachment';

export const getNeededAtMentionedUsernames = (usernames: Set<string>, posts: Post[], excludeUsername?: string) => {
    const usernamesToLoad = new Set<string>();

    const findNeededUsernames = (text?: string) => {
        if (!text || !text.includes('@')) {
            return;
        }

        let match;
        while ((match = MENTIONS_REGEX.exec(text)) !== null) {
            const lowercaseMatch = match[1].toLowerCase();

            if (General.SPECIAL_MENTIONS.has(lowercaseMatch)) {
                continue;
            }

            if (lowercaseMatch === excludeUsername) {
                continue;
            }

            if (usernames.has(lowercaseMatch)) {
                continue;
            }

            usernamesToLoad.add(lowercaseMatch);
        }
    };

    for (const post of posts) {
        // These correspond to the fields searched by getMentionsEnabledFields on the server
        findNeededUsernames(post.message);

        const attachments = isMessageAttachmentArray(post.props?.attachments) ? post.props.attachments : undefined;
        if (attachments) {
            for (const attachment of attachments) {
                findNeededUsernames(attachment.pretext);
                findNeededUsernames(attachment.text);
            }
        }
    }

    return usernamesToLoad;
};
