// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import FileIcon from '@components/files/file_icon';
import {getFormattedFileSize} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    contentMode: 'small' | 'large';
    file: FileInfo;
    hasError: boolean;
    theme: Theme;
};

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderWidth: 1,
        flexDirection: 'row',
        height: 64,
        justifyContent: 'flex-start',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowRadius: 3,
        shadowOpacity: 0.8,
        width: '100%',
    },
    error: {
        borderColor: theme.errorTextColor,
        borderWidth: 2,
    },
    info: {
        textTransform: 'uppercase',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75),
    },
    name: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
    },
    small: {
        flexDirection: 'column',
        height: 104,
        justifyContent: 'center',
        paddingHorizontal: 4,
        width: 104,
    },
    smallName: {
        ...typography('Body', 75, 'SemiBold'),
    },
    smallWrapper: {
        alignItems: 'center',
    },
}));

const Info = ({contentMode, file, hasError, theme}: Props) => {
    const styles = getStyles(theme);
    const containerStyle = useMemo(() => [
        styles.container,
        contentMode === 'small' && styles.small,
        hasError && styles.error,
    ], [contentMode, hasError]);

    const textContainerStyle = useMemo(() => (contentMode === 'small' && styles.smallWrapper), [contentMode]);

    const nameStyle = useMemo(() => [
        styles.name,
        contentMode === 'small' && styles.smallName,
    ], [contentMode]);

    const size = useMemo(() => {
        return `${file.extension} ${getFormattedFileSize(file.size)}`;
    }, [file.size, file.extension]);

    return (
        <View style={containerStyle}>
            <FileIcon file={file}/>
            <View style={textContainerStyle}>
                <Text
                    numberOfLines={1}
                    style={nameStyle}
                >
                    {file.name}
                </Text>
                <Text style={styles.info}>
                    {size}
                </Text>
            </View>
        </View>
    );
};

export default Info;
