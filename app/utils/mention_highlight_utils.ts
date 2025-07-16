// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getFullName} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

export interface MentionPosition {
    start: number;
    end: number;
    text: string;
    isFullname: boolean;
}

export function getMentionPositions(text: string, users: UserModel[]): MentionPosition[] {
    const positions: MentionPosition[] = [];
    const mentionKeys: string[] = [];
    const fullnameMentionKeys: string[] = [];

    // ユーザーリストからメンションキーを作成
    users.forEach((user) => {
        if (user.username) {
            mentionKeys.push(user.username);
        }

        const displayName = getFullName(user);
        if (displayName && displayName !== user.username) {
            fullnameMentionKeys.push(displayName);
        }
    });

    const allMentionKeys = [...mentionKeys, ...fullnameMentionKeys];

    if (allMentionKeys.length === 0) {
        return positions;
    }

    // 長い順にソートして、より長いマッチを優先
    const escapedKeys = allMentionKeys.map((key) =>
        key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );
    escapedKeys.sort((a, b) => b.length - a.length);

    const mentionRegex = new RegExp(`@(${escapedKeys.join('|')})(?=\\s|$|@)`, 'gi');

    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
        const mentionKey = match[1];
        const isFullname = fullnameMentionKeys.includes(mentionKey);

        positions.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            isFullname,
        });
    }

    return positions;
}

export function calculateTextWidth(text: string, fontSize: number): number {
    // React Nativeでのテキスト幅計算は複雑なため、
    // 簡易的な計算を使用（実際のプロジェクトでは react-native-text-size などを使用）
    const avgCharWidth = fontSize * 0.6; // 平均的な文字幅
    return text.length * avgCharWidth;
}
