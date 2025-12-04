// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, StyleSheet, type TextStyle, View} from 'react-native';

import Markdown from '@components/markdown';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    baseTextStyle: StyleProp<TextStyle>;
    channelId: string;
    location: AvailableScreens;
    metadata?: PostMetadata | null;
    theme: Theme;
    value?: string;
}

const style = StyleSheet.create({
    container: {
        marginTop: 5,
    },
});

export default function AttachmentPreText({
    baseTextStyle,
    channelId,
    location,
    theme,
    metadata,
    value,
}: Props) {

    if (!value) {
        return null;
    }

    return (
        <View style={style.container}>
            <Markdown
                baseTextStyle={baseTextStyle}
                channelId={channelId}
                disableGallery={true}
                imagesMetadata={metadata?.images}
                location={location}
                theme={theme}
                value={value}
            />
        </View>
    );
}
