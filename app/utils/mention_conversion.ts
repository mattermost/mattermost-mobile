// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getFullName} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const {USER} = MM_TABLES.SERVER;

// メンションの正規表現パターン
const MENTION_REGEX = /@([a-z0-9.\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/gi;
const FULLNAME_MENTION_REGEX = /@([^@\n]+?)(?=\s|[.,!?;:(){}[\]"'`]|@|$)/gi;

/**
 * テキストにメンションが含まれているかチェック
 */
export function containsMentions(text: string): boolean {
    // 正規表現を新しく作成（グローバルフラグのリセットのため）
    const mentionRegex = /@([a-z0-9.\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/gi;
    const fullnameRegex = /@([^@\n]+?)(?=\s|[.,!?;:(){}[\]"'`]|@|$)/gi;

    return mentionRegex.test(text) || fullnameRegex.test(text);
}

/**
 * デバウンス用のキャッシュ
 */
const debounceCache = new Map<string, Promise<string>>();
const debounceTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * ユーザー名からユーザー情報を取得
 */
async function getUserByUsername(serverUrl: string, username: string): Promise<UserModel | null> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!database) {
            return null;
        }

        const users = await database.collections.get(USER).query(Q.where('username', username)).fetch();
        return users.length > 0 ? users[0] as UserModel : null;
    } catch (error) {
        // Error fetching user by username
        return null;
    }
}

/**
 * フルネームからユーザー名を取得
 */
async function getUserByFullName(serverUrl: string, fullName: string): Promise<UserModel | null> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!database) {
            return null;
        }

        const users = await database.collections.get(USER).query().fetch();

        // フルネームでマッチするユーザーを検索
        for (const user of users) {
            const userModel = user as UserModel;
            const userFullName = getFullName(userModel);
            if (userFullName && userFullName.toLowerCase() === fullName.toLowerCase()) {
                return userModel;
            }
        }

        return null;
    } catch (error) {
        // Error fetching user by fullname
        return null;
    }
}

/**
 * ユーザー名をフルネームに変換
 */
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

        // 各メンションを並列処理
        const mentionPromises = mentions.map(async (mention) => {
            const username = mention.substring(1); // @を除去

            // ユーザーを取得
            const user = await getUserByUsername(serverUrl, username);
            if (!user) {
                return null;
            }

            const fullName = getFullName(user);
            if (fullName && fullName.trim() && fullName !== username) {
                return {username, fullName};
            }
            return null;
        });

        const results = await Promise.all(mentionPromises);

        // 結果を適用
        results.forEach((result) => {
            if (result) {
                // より確実なアプローチ: 文字列を直接検索して置換
                const searchPattern = `@${result.username}`;
                let searchIndex = 0;

                while (true) {
                    const index = convertedText.indexOf(searchPattern, searchIndex);
                    if (index === -1) {
                        break; // パターンが見つからない
                    }

                    // メンションの後の文字をチェック
                    const afterIndex = index + searchPattern.length;
                    const charAfter = afterIndex < convertedText.length ? convertedText[afterIndex] : '';

                    // メンションの前の文字をチェック（@マークの前）
                    const beforeChar = index > 0 ? convertedText[index - 1] : '';

                    // 有効なメンションかチェック（前の文字が英数字でない）
                    const isValidMention = index === 0 || !/[a-z0-9.\-_]/i.test(beforeChar);

                    if (isValidMention) {
                        // 置換文字列を作成
                        let replacement = `@${result.fullName}`;

                        // 後続文字に基づいてスペースを追加（句読点の前にはスペースを追加しない）
                        const needsSpace = charAfter &&
                                         charAfter !== ' ' &&
                                         charAfter !== '\n' &&
                                         charAfter !== '\t' &&
                                         charAfter !== '\r' &&
                                         !/[.,!?;:(){}[\]"'`\-]/.test(charAfter);

                        if (needsSpace) {
                            replacement += ' ';
                        }

                        // 文字列を置換
                        const before = convertedText.substring(0, index);
                        const after = convertedText.substring(afterIndex);
                        const newText = before + replacement + after;

                        convertedText = newText;

                        // 次の検索位置を更新
                        searchIndex = index + replacement.length;
                    } else {
                        searchIndex = index + 1;
                    }
                }
            }
        });

        // 末尾の余分なスペースを削除（文字列の最後のみ）
        convertedText = convertedText.replace(/\s+$/, '');

        // 連続するスペースを単一のスペースに変換（ただし必要なスペースは保持）
        convertedText = convertedText.replace(/[ \t]{2,}/g, ' ');

        return convertedText;
    } catch (error) {
        // Error converting usernames to fullnames
        return text;
    }
}

/**
 * フルネームをユーザー名に変換（送信時用）
 */
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

        // 各メンションを並列処理
        const mentionPromises = mentions.map(async (mention) => {
            const fullName = mention.substring(1); // @を除去

            const user = await getUserByFullName(serverUrl, fullName);
            if (user && user.username) {
                return {fullName, username: user.username};
            }
            return null;
        });

        const results = await Promise.all(mentionPromises);

        // 結果を適用
        results.forEach((result) => {
            if (result) {
                // より確実なアプローチ: 文字列を直接検索して置換
                const searchPattern = `@${result.fullName}`;
                let searchIndex = 0;

                while (true) {
                    const index = convertedText.indexOf(searchPattern, searchIndex);
                    if (index === -1) {
                        break; // パターンが見つからない
                    }

                    // メンションの後の文字をチェック
                    const afterIndex = index + searchPattern.length;
                    const charAfter = afterIndex < convertedText.length ? convertedText[afterIndex] : '';

                    // メンションの前の文字をチェック（@マークの前）
                    const beforeChar = index > 0 ? convertedText[index - 1] : '';

                    // 有効なメンションかチェック（前の文字が英数字でない）
                    const isValidMention = index === 0 || !/[a-z0-9.\-_]/i.test(beforeChar);

                    // 後続文字が境界文字かチェック（スペース、句読点、改行、文字列の終端）
                    const isValidBoundary = !charAfter ||
                                          /[\s.,!?;:(){}[\]"'`\-\n\t\r@]/.test(charAfter);

                    if (isValidMention && isValidBoundary) {
                        // 文字列を置換
                        const before = convertedText.substring(0, index);
                        const after = convertedText.substring(afterIndex);
                        const replacement = `@${result.username}`;
                        const newText = before + replacement + after;

                        convertedText = newText;

                        // 次の検索位置を更新
                        searchIndex = index + replacement.length;
                    } else {
                        searchIndex = index + 1;
                    }
                }
            }
        });

        return convertedText;
    } catch (error) {
        // Error converting fullnames to usernames
        return text;
    }
}

/**
 * デバウンス機能付きのユーザー名→フルネーム変換
 */
export function debounceConvertUsernamesToFullnames(
    text: string,
    serverUrl: string,
    debounceMs = 300,
): Promise<string> {
    const cacheKey = `${serverUrl}:${text}`;

    // 既存のタイムアウトをクリア
    const existingTimeout = debounceTimeouts.get(cacheKey);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
    }

    // キャッシュされた結果があれば返す
    const cachedPromise = debounceCache.get(cacheKey);
    if (cachedPromise) {
        return cachedPromise;
    }

    // 新しいPromiseを作成
    const promise = new Promise<string>((resolve) => {
        const timeout = setTimeout(async () => {
            try {
                const result = await convertUsernamesToFullnames(text, serverUrl);
                resolve(result);
            } catch (error) {
                // Error in debounced conversion
                resolve(text);
            } finally {
                // クリーンアップ
                debounceCache.delete(cacheKey);
                debounceTimeouts.delete(cacheKey);
            }
        }, debounceMs);

        debounceTimeouts.set(cacheKey, timeout);
    });

    debounceCache.set(cacheKey, promise);
    return promise;
}

/**
 * キャッシュをクリア
 */
export function clearMentionConversionCache(): void {
    // 全てのタイムアウトをクリア
    debounceTimeouts.forEach((timeout) => clearTimeout(timeout));
    debounceTimeouts.clear();
    debounceCache.clear();
}

