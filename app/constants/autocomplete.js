// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const AT_MENTION_REGEX = /\B(@([^@\r\n\s]*))$/i;

export const AT_MENTION_SEARCH_REGEX = /\bfrom:\s*(\S*)$/i;

export const CHANNEL_MENTION_REGEX = /\B(~([^~\r\n]*))$/i;

export const CHANNEL_MENTION_SEARCH_REGEX = /\b(?:in|channel):\s*(\S*)$/i;

export const DATE_MENTION_SEARCH_REGEX = /\b(?:on|before|after):\s*(\S*)$/i;

export const ALL_SEARCH_FLAGS_REGEX = /\b\w+:/g;