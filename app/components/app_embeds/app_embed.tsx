// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, TextStyle, View, ViewStyle} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import EmbedBindings from './embed_bindings';
import EmbedText from './embed_text';
import EmbedTitle from './embed_title';
import {Post} from '@mm-redux/types/posts';
import {Theme} from '@mm-redux/types/preferences';
import {AppBinding, PostEmbed} from '@mm-redux/types/apps';
import {fillBindingsInformation} from '@utils/apps';

type Props = {
    embed: PostEmbed,
    baseTextStyle?: StyleProp<TextStyle>,
    blockStyles?: StyleProp<ViewStyle>[],
    deviceHeight: number,
    post: Post,
    onPermalinkPress?: () => void,
    theme: Theme,
    textStyles?: StyleProp<TextStyle>[],
}

export default function AppEmbed(props: Props) {
    const {
        embed,
        baseTextStyle,
        blockStyles,
        deviceHeight,
        onPermalinkPress,
        post,
        textStyles,
        theme,
    } = props;

    const style = getStyleSheet(theme);

    let bindings;
    if (embed.bindings) {
        bindings = JSON.parse(JSON.stringify(embed.bindings)) as AppBinding[];
        bindings.forEach((b) => {
            b.app_id = embed.app_id;
            fillBindingsInformation(b);
        });
    }

    return (
        <React.Fragment>
            <View style={[style.container, style.border]}>
                <EmbedTitle
                    theme={theme}
                    value={embed.title}
                />
                <EmbedText
                    baseTextStyle={baseTextStyle}
                    blockStyles={blockStyles}
                    deviceHeight={deviceHeight}
                    onPermalinkPress={onPermalinkPress}
                    textStyles={textStyles}
                    value={embed.text}
                    theme={theme}
                />
                <EmbedBindings
                    bindings={bindings}
                    post={post}
                    theme={theme}
                />
            </View>
        </React.Fragment>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme:Theme) => {
    return {
        container: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderBottomWidth: 1,
            borderRightWidth: 1,
            borderTopWidth: 1,
            marginTop: 5,
            padding: 12,
        },
        border: {
            borderLeftColor: changeOpacity(theme.linkColor, 0.6),
            borderLeftWidth: 3,
        },
    };
});
