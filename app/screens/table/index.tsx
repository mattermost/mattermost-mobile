// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Platform, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type TableScreenProps = {
    renderAsFlex: boolean;
    width: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    fullHeight: {
        height: '100%',
        paddingHorizontal: 5,
    },
    displayFlex: {
        ...Platform.select({
            android: {
                flex: 1,
            },
            ios: {
                flex: 0,
            },
        }),
    },
    noTableText: {
        color: theme.dndIndicator,
        ...typography('Body', 200, 'Regular'),
    },
    noTableContainer: {
        padding: 24,
    },
}));

const Table = ({renderAsFlex, width}: TableScreenProps) => {
    const contentCallback = CallbackStore.getCallback<(isFullView: boolean) => JSX.Element|null>();
    const content = contentCallback?.(true);
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const viewStyle = renderAsFlex ? styles.displayFlex : {width};

    useEffect(() => {
        return () => {
            CallbackStore.removeCallback();
        };
    }, []);

    useAndroidHardwareBackHandler(Screens.TABLE, navigateBack);

    if (!content) {
        return (
            <View style={styles.noTableContainer}>
                <Text style={styles.noTableText}>{intl.formatMessage({id: 'table.cannot_display_table', defaultMessage: 'Cannot display table'})}</Text>
            </View>
        );
    }

    if (Platform.OS === 'android') {
        return (
            <View style={styles.container}>
                <ScrollView testID='table.screen'>
                    <ScrollView
                        contentContainerStyle={viewStyle}
                        horizontal={true}
                        testID='table.scroll_view'
                    >
                        {content}
                    </ScrollView>
                </ScrollView>
            </View>
        );
    }

    return (
        <SafeAreaView
            style={styles.container}
            testID='table.screen'
        >
            <ScrollView
                style={styles.fullHeight}
                contentContainerStyle={viewStyle}
                testID='table.scroll_view'
            >
                {content}
            </ScrollView>
        </SafeAreaView>
    );
};

export default Table;
