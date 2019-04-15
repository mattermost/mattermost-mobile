// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import emojiRegex from 'emoji-regex';

import {EmojiIndicesByAlias} from './emojis';

const RE_NAMED_EMOJI = /(:([a-zA-Z0-9_-]+):)/g;

const RE_UNICODE_EMOJI = emojiRegex();

const RE_EMOTICON = {
    slightly_smiling_face: /(^|\s)(:-?\))(?=$|\s)/g, // :)
    wink: /(^|\s)(;-?\))(?=$|\s)/g, // ;)
    open_mouth: /(^|\s)(:o)(?=$|\s)/gi, // :o
    scream: /(^|\s)(:-o)(?=$|\s)/gi, // :-o
    smirk: /(^|\s)(:-?])(?=$|\s)/g, // :]
    smile: /(^|\s)(:-?d)(?=$|\s)/gi, // :D
    stuck_out_tongue_closed_eyes: /(^|\s)(x-d)(?=$|\s)/gi, // x-d
    stuck_out_tongue: /(^|\s)(:-?p)(?=$|\s)/gi, // :p
    rage: /(^|\s)(:-?[[@])(?=$|\s)/g, // :@
    slightly_frowning_face: /(^|\s)(:-?\()(?=$|\s)/g, // :(
    cry: /(^|\s)(:[`'’]-?\(|:&#x27;\(|:&#39;\()(?=$|\s)/g, // :`(
    confused: /(^|\s)(:-?\/)(?=$|\s)/g, // :/
    confounded: /(^|\s)(:-?s)(?=$|\s)/gi, // :s
    neutral_face: /(^|\s)(:-?\|)(?=$|\s)/g, // :|
    flushed: /(^|\s)(:-?\$)(?=$|\s)/g, // :$
    mask: /(^|\s)(:-x)(?=$|\s)/gi, // :-x
    heart: /(^|\s)(<3|&lt;3)(?=$|\s)/g, // <3
    broken_heart: /(^|\s)(<\/3|&lt;&#x2F;3)(?=$|\s)/g, // </3
    thumbsup: /(^|\s)(:\+1:)(?=$|\s)/g, // :+1:
    thumbsdown: /(^|\s)(:-1:)(?=$|\s)/g, // :-1:
};

const MAX_JUMBO_EMOJIS = 4;

function isEmoticon(text) {
    for (const emoticon of Object.keys(RE_EMOTICON)) {
        const reEmoticon = RE_EMOTICON[emoticon];
        const matchEmoticon = text.match(reEmoticon);
        if (matchEmoticon && matchEmoticon[0] === text) {
            return true;
        }
    }

    return false;
}

export function getEmoticonName(value) {
    return Object.keys(RE_EMOTICON).find((key) => value.match(RE_EMOTICON[key]) !== null);
}

export function hasEmojisOnly(message, customEmojis) {
    if (!message || message.length === 0 || (/^\s{4}/).test(message)) {
        return {isEmojiOnly: false, shouldRenderJumboEmoji: false};
    }

    const chunks = message.trim().split(' ').filter((m) => m && m.length > 0);

    if (chunks.length === 0) {
        return {isEmojiOnly: false, shouldRenderJumboEmoji: false};
    }

    let emojiCount = 0;
    for (const chunk of chunks) {
        if (doesMatchNamedEmoji(chunk)) {
            const emojiName = chunk.substring(1, chunk.length - 1);
            if (EmojiIndicesByAlias.has(emojiName)) {
                emojiCount++;
                continue;
            }

            if (customEmojis && customEmojis.has(emojiName)) {
                emojiCount++;
                continue;
            }
        }

        const matchUnicodeEmoji = chunk.match(RE_UNICODE_EMOJI);
        if (matchUnicodeEmoji && matchUnicodeEmoji.join('') === chunk) {
            emojiCount += matchUnicodeEmoji.length;
            continue;
        }

        if (isEmoticon(chunk)) {
            emojiCount++;
            continue;
        }

        return {isEmojiOnly: false, shouldRenderJumboEmoji: false};
    }

    return {
        isEmojiOnly: true,
        shouldRenderJumboEmoji: emojiCount > 0 && emojiCount <= MAX_JUMBO_EMOJIS,
    };
}

export function doesMatchNamedEmoji(emojiName) {
    const match = emojiName.match(RE_NAMED_EMOJI);

    if (match && match[0] === emojiName) {
        return true;
    }

    return false;
}
