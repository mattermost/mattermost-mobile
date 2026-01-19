// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    renderAsFlex: boolean;
    renderRows: (isFullView: boolean) => JSX.Element|null;
    width: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    fullHeight: {
        height: '100%',
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

const Table = ({componentId, renderAsFlex, renderRows, width}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const content = renderRows(true);
    const viewStyle = renderAsFlex ? styles.displayFlex : {width};

    const intl = useIntl();

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    if (!content) {
        return (
            <View
                style={styles.noTableContainer}
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
                <Text style={styles.noTableText}>{intl.formatMessage({id: 'table.cannot_display_table', defaultMessage: 'Cannot display table'})}</Text>
            </View>
        );
    }

    if (Platform.OS === 'android') {
        return (
            <View
                style={styles.container}
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
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
            nativeID={SecurityManager.getShieldScreenId(componentId)}
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
