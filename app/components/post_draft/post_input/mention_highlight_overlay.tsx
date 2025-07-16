// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View, Text} from 'react-native';

import {useTheme} from '@context/theme';
import {getMentionPositions} from '@utils/mention_highlight_utils';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    text: string;
    textStyle: any;
    users?: UserModel[];
}

const MentionHighlightOverlay = ({
    text,
    textStyle,
    users = [],
}: Props) => {
    const theme = useTheme();

    const mentionPositions = useMemo(() => {
        return getMentionPositions(text, users);
    }, [text, users]);

    if (mentionPositions.length === 0) {
        return null;
    }

    return (
        <View
            style={{
                position: 'absolute',
                top: 0,
                left: -2, // 少し左にずらす
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
            }}
        >
            {/* メンション部分のハイライト表示 */}
            <Text style={[textStyle, {color: 'transparent'}]}>
                {text.split('').map((char, index) => {
                    const mentionAtIndex = mentionPositions.find((pos) =>
                        index >= pos.start && index < pos.end,
                    );

                    if (mentionAtIndex) {
                        const isFirstChar = index === mentionAtIndex.start;
                        const isLastChar = index === mentionAtIndex.end - 1;

                        return (
                            <Text
                                key={index}
                                style={{
                                    backgroundColor: theme.mentionHighlightBg || 'rgba(22, 109, 224, 0.15)',
                                    color: theme.mentionHighlightLink || '#166de0',
                                    borderTopLeftRadius: isFirstChar ? 3 : 0,
                                    borderBottomLeftRadius: isFirstChar ? 3 : 0,
                                    borderTopRightRadius: isLastChar ? 3 : 0,
                                    borderBottomRightRadius: isLastChar ? 3 : 0,
                                }}
                            >
                                {char}
                            </Text>
                        );
                    }

                    return char;
                })}
            </Text>
        </View>
    );
};

export default MentionHighlightOverlay;
