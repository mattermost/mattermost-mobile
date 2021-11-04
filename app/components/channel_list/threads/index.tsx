// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {goToScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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

    /*
     * @to-do:
     * - Check if there are threads, else return null
     * - Change to button, navigate to threads view
     * - Add right-side number badge
     */
    return (
        <TouchableWithFeedback onPress={() => goToScreen(Screens.CHANNEL, 'Channel', {}, {topBar: {visible: false}})} >
            <View style={styles.container}>
                <CompassIcon
                    name='message-text-outline'
                    style={styles.icon}
                />
                <Text style={[textStyle, styles.text]}>{'Threads'}</Text>
            </View>
        </TouchableWithFeedback>
    );
};

export default ThreadsButton;
