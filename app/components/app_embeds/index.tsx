// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, TextStyle, View, ViewStyle} from 'react-native';

import AppEmbed from './app_embed';
import {Post} from '@mm-redux/types/posts';
import {Theme} from '@mm-redux/types/preferences';
import {PostEmbed} from '@mm-redux/types/apps';

type Props = {
    embeds: PostEmbed[],
    baseTextStyle?: StyleProp<TextStyle>,
    blockStyles?: StyleProp<ViewStyle>[],
    deviceHeight: number,
    deviceWidth: number,
    post: Post,
    onPermalinkPress?: () => void,
    theme: Theme,
    textStyles?: StyleProp<TextStyle>[],
}

export default function AppEmbeds(props: Props) {
    const {
        embeds,
        baseTextStyle,
        blockStyles,
        deviceHeight,
        onPermalinkPress,
        post,
        theme,
        textStyles,
    } = props;
    const content = [] as JSX.Element[];

    embeds.forEach((embed, i) => {
        content.push(
            <AppEmbed
                embed={embed}
                baseTextStyle={baseTextStyle}
                blockStyles={blockStyles}
                deviceHeight={deviceHeight}
                key={'att_' + i}
                onPermalinkPress={onPermalinkPress}
                post={post}
                theme={theme}
                textStyles={textStyles}
            />,
        );
    });

    return (
        <View style={{flex: 1, flexDirection: 'column'}}>
            {content}
        </View>
    );
}
