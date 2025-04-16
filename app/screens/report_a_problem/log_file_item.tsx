// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useState} from 'react';
import {View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {getFileSize, getFormattedFileSize} from '@utils/file';

import {getCommonFileStyles} from './styles';

type Props = {
    path: string;
}

const LogFileItem = ({path}: Props) => {
    const theme = useTheme();
    const styles = getCommonFileStyles(theme);

    const [size, setSize] = useState<string>();

    const filename = path.split('/').pop() || '';

    useEffect(() => {
        getFileSize(path).then((fileSize) => {
            setSize(getFormattedFileSize(fileSize));
        });
    }, [path]);

    return (
        <View style={styles.container}>
            <CompassIcon
                name='file-text-outline'
                size={40}
                color={theme.centerChannelColor}
                testID='log-file-icon'
            />
            <View style={styles.header}>
                <Text style={styles.name}>
                    {filename}
                </Text>
                <Text style={styles.type}>
                    {`TXT ${size}`}
                </Text>
            </View>
        </View>
    );
};

export default LogFileItem;
