// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import FileIcon from '@components/post_list/post/body/files/file_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    fileInfo: FileInfo;
    layoutWidth?: number;
    location?: string;
    metadata?: PostMetadata;
    postId?: string;
    theme?: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
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
        message: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
    };
});

export default function FileCard({fileInfo}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    let borderStyle;
    return (
        <View style={[style.container, style.border, borderStyle]}>
            <Text>{fileInfo.name}</Text>
            <Text>{fileInfo.post_id}</Text>
            <Text>{fileInfo.create_at}</Text>
            <Text>{fileInfo.size}</Text>
            <Text>{'...'}</Text>
            <FileIcon/>
        </View>
    );
}
