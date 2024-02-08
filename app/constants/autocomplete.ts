// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const AT_MENTION_REGEX = /\B(@([^@\r\n]*))$/i;

export const AT_MENTION_REGEX_GLOBAL = /\B(@([^@\r\n]*))/gi;

export const AT_MENTION_SEARCH_REGEX = /\bfrom:\s*([^\r\n]*)$/i;

export const CHANNEL_MENTION_REGEX = /\B(~([^~\r\n]*))$/i;

export const CHANNEL_MENTION_REGEX_DELAYED = /\B(~([^~\r\n]{2,}))$/i;

export const CHANNEL_MENTION_SEARCH_REGEX = /\b(?:in|channel):\s*([^\r\n]*)$/i;

export const DATE_MENTION_SEARCH_REGEX = /\b(?:on|before|after):\s*(\S*)$/i;

export const ALL_SEARCH_FLAGS_REGEX = /\b\w+:/g;

export const CODE_REGEX = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)| *(`{3,}|~{3,})[ .]*(\S+)? *\n([\s\S]*?\s*)\3 *(?:\n+|$)/g;

export const MENTIONS_REGEX = /(?:\B|\b_+)@([\p{L}0-9.\-_]+)(?<![.])/gui;

export const SPECIAL_MENTIONS_REGEX = /(?:\B|\b_+)@(channel|all|here)(?!(\.|-|_)*[^\W_])/gi;

export const MAX_LIST_HEIGHT = 230;
export const MAX_LIST_TABLET_DIFF = 90;

export default {
    ALL_SEARCH_FLAGS_REGEX,
    AT_MENTION_REGEX,
    AT_MENTION_REGEX_GLOBAL,
    AT_MENTION_SEARCH_REGEX,
    CHANNEL_MENTION_REGEX,
    CHANNEL_MENTION_REGEX_DELAYED,
    CHANNEL_MENTION_SEARCH_REGEX,
    CODE_REGEX,
    DATE_MENTION_SEARCH_REGEX,
    MAX_LIST_HEIGHT,
    MENTIONS_REGEX,
    SPECIAL_MENTIONS_REGEX,
};
