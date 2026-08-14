// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Platform, ScrollView, Text, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets, type Edge} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useWindowDimensions} from '@hooks/device';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const TABLE_HORIZONTAL_PADDING = 10;

export type TableScreenProps = {
    renderAsFlex: boolean;
    width: number;
}

// The navigation header already accounts for the top inset
const SAFE_AREA_EDGES: Edge[] = ['bottom', 'left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    fullHeight: {
        height: '100%',
        paddingHorizontal: 5,
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
    const contentCallback = CallbackStore.getCallback<(isFullView: boolean) => React.ReactNode>();
    const content = contentCallback?.(true);
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {width: windowWidth} = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // iOS: flex:1 inside a vertical ScrollView leaves content width ambiguous
    // and clips 3-column wrap tables (MM-T4899_2). Size to the safe viewport.
    // Android already nests a horizontal ScrollView and must keep its previous
    // flex:1 / explicit-width behavior so production layout does not change.
    let viewStyle: {width: number} | {flex: number} = {width};
    if (renderAsFlex) {
        viewStyle = Platform.OS === 'android' ? {flex: 1} : {
            width: windowWidth - insets.left - insets.right - TABLE_HORIZONTAL_PADDING,
        };
    }

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
            edges={SAFE_AREA_EDGES}
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
