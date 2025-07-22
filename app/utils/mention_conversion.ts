// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getFullName} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const {USER} = MM_TABLES.SERVER;

const MENTION_REGEX = /@([a-z0-9.\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/gi;
const FULLNAME_MENTION_REGEX = /@([^@\n]+?)(?=\s|[.,!?;:(){}[\]]|@|$)/gi;

export function containsMentions(text: string): boolean {
    MENTION_REGEX.lastIndex = 0;
    FULLNAME_MENTION_REGEX.lastIndex = 0;
    return MENTION_REGEX.test(text) || FULLNAME_MENTION_REGEX.test(text);
}

const debounceCache = new Map<string, Promise<string>>();
const debounceTimeouts = new Map<string, NodeJS.Timeout>();

async function getUsersByUsernames(serverUrl: string, usernames: string[]): Promise<Map<string, UserModel>> {
    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    if (!database || usernames.length === 0) {
        return new Map();
    }

    const users = await database.collections.get(USER).
        query(Q.where('username', Q.oneOf(usernames))).
        fetch();

    const userMap = new Map<string, UserModel>();
    users.forEach((user) => {
        const userModel = user as UserModel;
        userMap.set(userModel.username, userModel);
    });

    return userMap;
}

async function getUsersByFullNames(serverUrl: string, fullNames: string[]): Promise<Map<string, UserModel>> {
    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    if (!database || fullNames.length === 0) {
        return new Map();
    }

    // Collect all unique words from all full names
    const allWords = new Set<string>();
    for (const name of fullNames) {
        const words = name.toLowerCase().split(' ').filter((w) => w.length > 0);
        words.forEach((word) => allWords.add(word));
    }

    if (allWords.size === 0) {
        return new Map();
    }

    // Use prefix search for index-friendly queries that cover most practical use cases
    const wordConditions = Array.from(allWords).map((word) =>
        Q.or(
            Q.where('first_name', Q.like(`${word}%`)),
            Q.where('last_name', Q.like(`${word}%`)),
        ),
    );

    const users = await database.collections.get(USER).
        query(Q.or(...wordConditions)).
        fetch();

    const userMap = new Map<string, UserModel>();
    const normalizedFullNames = fullNames.map((name) => name.toLowerCase());

    users.forEach((user) => {
        const userModel = user as UserModel;
        const userFullName = getFullName(userModel);
        if (userFullName) {
            const normalizedUserFullName = userFullName.toLowerCase();
            const matchingIndex = normalizedFullNames.indexOf(normalizedUserFullName);
            if (matchingIndex !== -1) {
                userMap.set(fullNames[matchingIndex], userModel);
            }
        }
    });

    return userMap;
}

export async function convertUsernamesToFullnames(
    text: string,
    serverUrl: string,
): Promise<string> {
    if (!text || !containsMentions(text)) {
        return text;
    }

    try {
        let convertedText = text;
        const mentions = text.match(MENTION_REGEX);

        if (!mentions) {
            return text;
        }

        const uniqueUsernames = Array.from(new Set(mentions.map((mention) => mention.substring(1))));
        const userMap = await getUsersByUsernames(serverUrl, uniqueUsernames);
        const userLookupResults = new Map<string, {username: string; fullName: string}>();

        userMap.forEach((user, username) => {
            const fullName = getFullName(user);
            if (fullName && fullName.trim() && fullName !== username) {
                userLookupResults.set(username, {username, fullName});
            }
        });

        userLookupResults.forEach((result) => {
            const searchPattern = `@${result.username}`;
            let searchIndex = 0;

            while (true) {
                const index = convertedText.indexOf(searchPattern, searchIndex);
                if (index === -1) {
                    break;
                }

                const afterIndex = index + searchPattern.length;
                const beforeChar = index > 0 ? convertedText[index - 1] : '';
                const isValidMention = index === 0 || !/[a-z0-9.\-_]/i.test(beforeChar);

                if (isValidMention) {
                    const replacement = `@${result.fullName}`;
                    const before = convertedText.substring(0, index);
                    const after = convertedText.substring(afterIndex);
                    convertedText = before + replacement + after;
                    searchIndex = index + replacement.length;
                } else {
                    searchIndex = index + 1;
                }
            }
        });

        // Normalize multiple spaces to a single space (preserves trailing space)
        convertedText = convertedText.replace(/[ \t]{2,}/g, ' ');

        return convertedText;
    } catch (error) {
        return text;
    }
}

export async function convertFullnamesToUsernames(
    text: string,
    serverUrl: string,
): Promise<string> {
    if (!text || !text.includes('@')) {
        return text;
    }

    try {
        let convertedText = text;
        const mentions = text.match(FULLNAME_MENTION_REGEX);

        if (!mentions) {
            return text;
        }

        const uniqueFullNames = Array.from(new Set(mentions.map((mention) => mention.substring(1))));
        const userMap = await getUsersByFullNames(serverUrl, uniqueFullNames);
        const userLookupResults = new Map<string, {fullName: string; username: string}>();

        userMap.forEach((user, fullName) => {
            if (user.username) {
                userLookupResults.set(fullName, {fullName, username: user.username});
            }
        });

        userLookupResults.forEach((result) => {
            const searchPattern = `@${result.fullName}`;
            let searchIndex = 0;

            while (true) {
                const index = convertedText.indexOf(searchPattern, searchIndex);
                if (index === -1) {
                    break;
                }

                const afterIndex = index + searchPattern.length;
                const charAfter = afterIndex < convertedText.length ? convertedText[afterIndex] : '';
                const beforeChar = index > 0 ? convertedText[index - 1] : '';
                const isValidMention = index === 0 || !/[a-z0-9.\-_]/i.test(beforeChar);
                const isValidBoundary = !charAfter ||
                                      /[\s.,!?;:(){}[\]"'`\-\n\t\r@]/.test(charAfter);

                if (isValidMention && isValidBoundary) {
                    const before = convertedText.substring(0, index);
                    const after = convertedText.substring(afterIndex);
                    const replacement = `@${result.username}`;
                    convertedText = before + replacement + after;
                    searchIndex = index + replacement.length;
                } else {
                    searchIndex = index + 1;
                }
            }
        });

        return convertedText;
    } catch (error) {
        return text;
    }
}

export function debounceConvertUsernamesToFullnames(
    text: string,
    serverUrl: string,
    debounceMs = 300,
): Promise<string> {
    const cacheKey = `${serverUrl}:${text}`;

    const existingTimeout = debounceTimeouts.get(cacheKey);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
    }

    const cachedPromise = debounceCache.get(cacheKey);
    if (cachedPromise) {
        return cachedPromise;
    }

    const promise = new Promise<string>((resolve) => {
        const timeout = setTimeout(async () => {
            try {
                const result = await convertUsernamesToFullnames(text, serverUrl);
                resolve(result);
            } catch (error) {
                resolve(text);
            } finally {
                debounceCache.delete(cacheKey);
                debounceTimeouts.delete(cacheKey);
            }
        }, debounceMs);

        debounceTimeouts.set(cacheKey, timeout);
    });

    debounceCache.set(cacheKey, promise);
    return promise;
}

export function clearMentionConversionCache(): void {
    debounceTimeouts.forEach((timeout) => clearTimeout(timeout));
    debounceTimeouts.clear();
    debounceCache.clear();
}

