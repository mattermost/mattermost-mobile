// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import emojiRegex from 'emoji-regex';

import {Emojis, EmojiIndicesByAlias} from './emojis';

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

    const chunks = message.trim().replace(/\n/g, ' ').split(' ').filter((m) => m && m.length > 0);

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

export function getEmojiByName(emojiName) {
    if (EmojiIndicesByAlias.has(emojiName)) {
        return Emojis[EmojiIndicesByAlias.get(emojiName)];
    }

    return null;
}

// Since there is no shared logic between the web and mobile app
// this is copied from the webapp as custom sorting logic for emojis

const defaultComparisonRule = (aName, bName) => {
    return aName.localeCompare(bName);
};

const thumbsDownComparisonRule = (other) =>
    (other === 'thumbsup' || other === '+1' ? 1 : 0);
const thumbsUpComparisonRule = (other) => (other === 'thumbsdown' || other === '-1' ? -1 : 0);

const customComparisonRules = {
    thumbsdown: thumbsDownComparisonRule,
    '-1': thumbsDownComparisonRule,
    thumbsup: thumbsUpComparisonRule,
    '+1': thumbsUpComparisonRule,
};

function doDefaultComparison(aName, bName) {
    if (customComparisonRules[aName]) {
        return customComparisonRules[aName](bName) || defaultComparisonRule(aName, bName);
    }

    return defaultComparisonRule(aName, bName);
}

export function compareEmojis(emojiA, emojiB, searchedName) {
    const aName = emojiA.name || (emojiA.aliases ? emojiA.aliases[0] : emojiA);
    const bName = emojiB.name || (emojiB.aliases ? emojiB.aliases[0] : emojiB);

    if (!searchedName) {
        return doDefaultComparison(aName, bName);
    }

    // Have the emojis that start with the search appear first
    const aPrefix = aName.startsWith(searchedName);
    const bPrefix = bName.startsWith(searchedName);

    if (aPrefix && bPrefix) {
        return doDefaultComparison(aName, bName);
    } else if (aPrefix) {
        return -1;
    } else if (bPrefix) {
        return 1;
    }

    // Have the emojis that contain the search appear next
    const aIncludes = aName.includes(searchedName);
    const bIncludes = bName.includes(searchedName);

    if (aIncludes && bIncludes) {
        return doDefaultComparison(aName, bName);
    } else if (aIncludes) {
        return -1;
    } else if (bIncludes) {
        return 1;
    }

    return doDefaultComparison(aName, bName);
}
