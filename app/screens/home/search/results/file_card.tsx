// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View, TouchableOpacity} from 'react-native';

import FileIcon from '@components/post_list/post/body/files/file_icon';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import FileOptions from './file_options';

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
            borderLeftColor: changeOpacity(theme.linkColor, 0.6),
            borderLeftWidth: 3,
        },
        message: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
    };
});

export default function FileCard({fileInfo}: Props) {
    const theme = useTheme();
    const intl = useIntl();
    const style = getStyleSheet(theme);

    const onPress = () => {
        const renderContent = () => {
            return (
                <FileOptions
                    fileInfo={fileInfo}
                />

            );
        };
        bottomSheet({
            closeButtonId: 'close-search-file-options',
            renderContent,
            snapPoints: [400, 10],
            theme,
            title: '',
        });
    };
    return (
        <View style={[style.container, style.border]}>
            <TouchableOpacity onPress={onPress}>
                <Text style={style.message}>{'To be implemented'}</Text>
                <Text style={style.message}>{`Name: ${fileInfo.name}`}</Text>
                <Text style={style.message}>{`Size: ${fileInfo.size}`}</Text>
                <FileIcon
                    file={fileInfo}
                    iconSize={48}
                />
            </TouchableOpacity>
        </View>
    );
}
