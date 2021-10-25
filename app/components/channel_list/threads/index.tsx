// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';
import CompassIcon from '@components/compass_icon';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        display: 'flex',
        flexDirection: 'row',
    },
    icon: {
        fontSize: 24,
        lineHeight: 28,
        color: theme.sidebarText,
    },
    text: {
        color: theme.sidebarText,
        paddingLeft: 12,
    },
}));

const textStyle = StyleSheet.create([typography('Body', 200, 'SemiBold')]);

const ThreadsButton = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <CompassIcon
                name='message-text-outline'
                style={styles.icon}
            />
            <Text style={[textStyle, styles.text]}>{'Threads'}</Text>
        </View>
    );
};

export default ThreadsButton;
