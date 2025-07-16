// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text} from 'react-native';

import {useTheme} from '@context/theme';
import {containsMentions} from '@utils/mention_conversion';
import {getFullName} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    text: string;
    textStyle: any;
    enableMentionConversion?: boolean;
    users?: UserModel[];
}

const MentionHighlight = ({
    text,
    textStyle,
    enableMentionConversion,
    users = [],
}: Props) => {
    const theme = useTheme();

    const getMentionKeys = () => {
        const mentionKeys: string[] = [];
        const fullnameMentionKeys: string[] = [];

        users.forEach((user) => {
            // ユーザー名を追加
            if (user.username) {
                mentionKeys.push(user.username);
            }

            // フルネームを追加（ユーザー名と異なる場合のみ）
            const displayName = getFullName(user);
            if (displayName && displayName !== user.username) {
                fullnameMentionKeys.push(displayName);
            }
        });

        return {mentionKeys, fullnameMentionKeys};
    };

    const highlightedText = useMemo(() => {
        if (!enableMentionConversion || !containsMentions(text)) {
            return [{text, isMention: false}];
        }

        const {mentionKeys, fullnameMentionKeys} = getMentionKeys();
        const allMentionKeys = [...mentionKeys, ...fullnameMentionKeys];

        if (allMentionKeys.length === 0) {
            return [{text, isMention: false}];
        }

        // メンションキーをエスケープして正規表現を作成
        const escapedKeys = allMentionKeys.map((key) =>
            key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        );

        // 長い順にソートして、より長いマッチを優先
        escapedKeys.sort((a, b) => b.length - a.length);

        const mentionRegex = new RegExp(`@(${escapedKeys.join('|')})(?=\\s|$|@)`, 'gi');

        const parts: Array<{text: string; isMention: boolean; isFullname?: boolean}> = [];
        let lastIndex = 0;

        text.replace(mentionRegex, (match, mentionKey, offset) => {
            // 前のテキスト部分を追加
            if (offset > lastIndex) {
                parts.push({
                    text: text.substring(lastIndex, offset),
                    isMention: false,
                });
            }

            // フルネームかどうかを判定
            const isFullname = fullnameMentionKeys.includes(mentionKey);

            parts.push({
                text: match,
                isMention: true,
                isFullname,
            });

            lastIndex = offset + match.length;
            return match;
        });

        // 残りのテキスト部分を追加
        if (lastIndex < text.length) {
            parts.push({
                text: text.substring(lastIndex),
                isMention: false,
            });
        }

        return parts;
    }, [text, enableMentionConversion, users]);

    return (
        <Text style={[textStyle, {color: textStyle?.color || '#000'}]}>
            {highlightedText.map((part, index) => {
                if (part.isMention) {
                    return (
                        <Text
                            key={index}
                            style={[
                                textStyle,
                                {
                                    backgroundColor: theme.mentionHighlightBg || 'rgba(255, 193, 7, 0.3)',
                                    color: theme.mentionHighlightLink || '#166de0',
                                    borderRadius: 3,
                                    paddingHorizontal: 2,
                                    fontWeight: part.isFullname ? '600' : 'normal',
                                },
                            ]}
                        >
                            {part.text}
                        </Text>
                    );
                }
                return (
                    <Text
                        key={index}
                        style={[textStyle, {color: textStyle?.color || '#000'}]}
                    >
                        {part.text}
                    </Text>
                );
            })}
        </Text>
    );
};

export default MentionHighlight;

