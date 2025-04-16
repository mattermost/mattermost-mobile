// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import LogFileItem from './log_file_item';
import {getCommonFileStyles} from './styles';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    const commonStyles = getCommonFileStyles(theme);
    return {
        ...commonStyles,
        container: {
            ...commonStyles.container,
            flexDirection: 'column',
            alignItems: undefined,
        },
        zipHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        logsContainer: {
            gap: 10,
        },
    };
});

type Props = {
    logFiles: string[];
    isLoading: boolean;
}
const ZipContainer = ({
    logFiles,
    isLoading,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    let content = (
        <ActivityIndicator
            testID='logs-loading'
            color={theme.buttonBg}
            size='large'
        />
    );

    if (!isLoading) {
        content = (
            <>
                <View style={styles.zipHeader}>
                    <CompassIcon
                        name='file-zip-outline'
                        size={40}
                        color={theme.centerChannelColor}
                        testID='zip-icon'
                    />
                    <View style={styles.header}>
                        <Text style={styles.name}>
                            {'Logs'}
                        </Text>
                        <Text style={styles.type}>
                            {'ZIP'}
                        </Text>
                    </View>
                </View>
                <ScrollView
                    horizontal={true}
                    contentContainerStyle={styles.logsContainer}
                    showsHorizontalScrollIndicator={false}
                >
                    {logFiles.map((path) => (
                        <LogFileItem
                            key={path}
                            path={path}
                        />
                    ))}
                </ScrollView>
            </>
        );
    }
    return (
        <View style={styles.container}>
            {content}
        </View>
    );
};

export default ZipContainer;
