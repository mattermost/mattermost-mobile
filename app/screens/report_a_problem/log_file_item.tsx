// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import RNUtils from '@mattermost/rnutils';
import React, {useEffect, useState} from 'react';
import {View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    path: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    logItem: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logInfo: {
        flex: 1,
    },
    logName: {
        ...typography('Body', 100, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    logSize: {
        ...typography('Body', 75),
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
}));

const LogFileItem = ({path}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const [size, setSize] = useState<number>();

    const filename = path.split('/').pop() || '';

    useEffect(() => {
        RNUtils.getFileSize(path).then((fileSize) => {
            setSize(Math.round(fileSize / 1024));
        });
    }, [path]);

    return (
        <View style={styles.logItem}>
            <CompassIcon
                name='file-text-outline'
                size={40}
                color={theme.centerChannelColor}
                testID='log-file-icon'
            />
            <View style={styles.logInfo}>
                <Text style={styles.logName}>
                    {filename}
                </Text>
                <Text style={styles.logSize}>
                    {`TXT ${size}KB`}
                </Text>
            </View>
        </View>
    );
};

export default LogFileItem;
