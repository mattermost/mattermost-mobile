// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';

import {getCommonFileStyles} from './styles';

const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

const LogFileItem = () => {
    const theme = useTheme();
    const styles = getCommonFileStyles(theme);

    const currentDate = getCurrentDate();

    return (
        <View style={styles.container}>
            <CompassIcon
                name='file-zip-outline-large'
                size={40}
                color={theme.centerChannelColor}
                testID='log-file-icon'
            />
            <View style={styles.header}>
                <Text style={styles.name}>
                    {`Logs_${currentDate}`}
                </Text>
                <Text style={styles.type}>
                    {'ZIP'}
                </Text>
            </View>
        </View>
    );
};

export default LogFileItem;
