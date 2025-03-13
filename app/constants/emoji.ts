// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const MAX_ALLOWED_REACTIONS = 40;
export const SORT_BY_NAME = 'name';
export const EMOJIS_PER_PAGE = 90;

// reEmoji matches an emoji (eg. :taco:) at the start of a string.
export const reEmoji = /^:([a-z0-9_\-+]+):\B/i;

// reEmoticon matches an emoticon (eg. :D) at the start of a string.
export const reEmoticon = /^(?:(:-?\))|(;-?\))|(:o)|(:-o)|(:-?])|(:-?d)|(x-d)|(:-?p)|(:-?[[@])|(:-?\()|(:['’]-?\()|(:-?\/)|(:-?s)|(:-?\|)|(:-?\$)|(:-x)|(<3|&lt;3)|(<\/3|&lt;\/3)|(:[`'’]-?\(|:&#x27;\(|:&#39;\())(?=$|\s|[*_~?])/i;

// reMain matches some amount of plain text, starting at the beginning of the string and hopefully stopping right
// before the next emoji by looking for any character that could start an emoji (:, ;, x, or <)
export const reMain = /^[\s\S]+?(?=[:;x<]|$)/i;

export const EMOJI_SIZE = 34;
export const EMOJI_ROW_MARGIN = 12;
export const EMOJIS_PER_ROW = 7;
export const EMOJIS_PER_ROW_TABLET = 9;

export const EMOJI_CATEGORY_ICONS: Record<string, string> = {
    recent: 'clock-outline',
    'smileys-emotion': 'emoticon-happy-outline',
    'people-body': 'account-outline',
    'animals-nature': 'leaf-outline',
    'food-drink': 'food-apple',
    'travel-places': 'airplane-variant',
    activities: 'basketball',
    objects: 'lightbulb-outline',
    symbols: 'heart-outline',
    flags: 'flag-outline',
    custom: 'emoticon-custom-outline',
};

export default {
    MAX_ALLOWED_REACTIONS,
    SORT_BY_NAME,

    EMOJI_SIZE,
    EMOJI_ROW_MARGIN,
    EMOJIS_PER_ROW,
    EMOJIS_PER_ROW_TABLET,
    EMOJI_CATEGORY_ICONS,
};
