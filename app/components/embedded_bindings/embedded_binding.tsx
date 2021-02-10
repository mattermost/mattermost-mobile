// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, TextStyle, View, ViewStyle} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import EmbedSubBindings from './embedded_sub_bindings';
import EmbedText from './embed_text';
import EmbedTitle from './embed_title';
import {Post} from '@mm-redux/types/posts';
import {Theme} from '@mm-redux/types/preferences';
import {AppBinding} from '@mm-redux/types/apps';
import {fillBindingsInformation} from '@utils/apps';

type Props = {
    embed: AppBinding,
    baseTextStyle?: StyleProp<TextStyle>,
    blockStyles?: StyleProp<ViewStyle>[],
    deviceHeight: number,
    post: Post,
    onPermalinkPress?: () => void,
    theme: Theme,
    textStyles?: StyleProp<TextStyle>[],
}

export default function EmbeddedBinding(props: Props) {
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

    const fillBindings = (binding: AppBinding) => {
        const copiedBindings = JSON.parse(JSON.stringify(binding)) as AppBinding;
        fillBindingsInformation(copiedBindings);
        return copiedBindings.bindings;
    };

    const bindings = fillBindings(embed);

    return (
        <React.Fragment>
            <View style={[style.container, style.border]}>
                <EmbedTitle
                    theme={theme}
                    value={embed.label}
                />
                <EmbedText
                    baseTextStyle={baseTextStyle}
                    blockStyles={blockStyles}
                    deviceHeight={deviceHeight}
                    onPermalinkPress={onPermalinkPress}
                    textStyles={textStyles}
                    value={embed.description}
                    theme={theme}
                />
                <EmbedSubBindings
                    bindings={bindings}
                    post={post}
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
