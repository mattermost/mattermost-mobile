// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {v4 as uuidv4} from 'uuid';

/**
 * Explicit `wait` should not normally used but made available for special cases.
 * @param {number} ms - duration in millisecond
 */
export const wait = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const isAndroid = () => {
    return !process.env.IOS;
};

export const isIos = () => {
    return process.env.IOS;
};

/**
 * @param {number} length - length on random string to return, e.g. 6 (default)
 * @return {string} random string
 */
export const getRandomId = (length = 6) => {
    const MAX_SUBSTRING_INDEX = 27;

    return uuidv4().replace(/-/g, '').substring(MAX_SUBSTRING_INDEX - length, MAX_SUBSTRING_INDEX);
};

/**
 * @param {string} text
 * @return {string} capitalized text
 */
export const capitalize = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const SECOND = 1000;
const MINUTE = 60 * 1000;

export const timeouts = {
    HALF_SEC: SECOND / 2,
    ONE_SEC: SECOND,
    TWO_SEC: SECOND * 2,
    FOUR_SEC: SECOND * 4,
    TEN_SEC: SECOND * 10,
    HALF_MIN: MINUTE / 2,
    ONE_MIN: MINUTE,
    TWO_MIN: MINUTE * 2,
    FOUR_MIN: MINUTE * 4,
};
