// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, StyleSheet, TextStyle, View, ViewStyle} from 'react-native';

import Markdown from '@components/markdown';
import {PostMetadata} from '@mm-redux/types/posts';

type Props = {
    baseTextStyle: StyleProp<TextStyle>;
        blockStyles?: StyleProp<ViewStyle>[];
        metadata?: PostMetadata;
        onPermalinkPress?: () => void;
        textStyles?: StyleProp<TextStyle>[];
        value?: string;
}
export default function AttachmentPreText(props: Props) {
    const {
        baseTextStyle,
        blockStyles,
        metadata,
        onPermalinkPress,
        value,
        textStyles,
    } = props;

    if (!value) {
        return null;
    }

    return (
        <View style={style.container}>
            <Markdown
                baseTextStyle={baseTextStyle}
                textStyles={textStyles}
                blockStyles={blockStyles}
                disableGallery={true}
                imagesMetadata={metadata?.images}
                value={value}
                onPermalinkPress={onPermalinkPress}
            />
        </View>
    );
}

const style = StyleSheet.create({
    container: {
        marginTop: 5,
    },
});
