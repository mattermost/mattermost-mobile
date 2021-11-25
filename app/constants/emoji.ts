// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const MAX_ALLOWED_REACTIONS = 40;
export const SORT_BY_NAME = 'name';
export const EMOJIS_PER_PAGE = 200;

// reEmoji matches an emoji (eg. :taco:) at the start of a string.
export const reEmoji = /^:([a-z0-9_\-+]+):\B/i;

// reEmoticon matches an emoticon (eg. :D) at the start of a string.
export const reEmoticon = /^(?:(:-?\))|(;-?\))|(:o)|(:-o)|(:-?])|(:-?d)|(x-d)|(:-?p)|(:-?[[@])|(:-?\()|(:['’]-?\()|(:-?\/)|(:-?s)|(:-?\|)|(:-?\$)|(:-x)|(<3|&lt;3)|(<\/3|&lt;\/3)|(:[`'’]-?\(|:&#x27;\(|:&#39;\())(?=$|\s|[*_~?])/i;

// reMain matches some amount of plain text, starting at the beginning of the string and hopefully stopping right
// before the next emoji by looking for any character that could start an emoji (:, ;, x, or <)
export const reMain = /^[\s\S]+?(?=[:;x<]|$)/i;
export default {
    MAX_ALLOWED_REACTIONS,
    SORT_BY_NAME,
};
