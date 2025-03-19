// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ScrollView} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import SecurityManager from '@managers/security_manager';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';

const edges: Edge[] = ['left', 'right', 'bottom'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        contentContainerStyle: {
            marginTop: 8,
            flexGrow: 1,
        },
    };
});

type SettingContainerProps = {
   children: React.ReactNode;
   testID?: string;
}
const SettingContainer = ({children, testID}: SettingContainerProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
            testID={`${testID}.screen`}
            nativeID={SecurityManager.getShieldScreenId(`${testID}.screen` as AvailableScreens)}
        >
            <ScrollView
                contentContainerStyle={styles.contentContainerStyle}
                alwaysBounceVertical={false}
                testID={`${testID}.scroll_view`}
            >
                {children}
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingContainer;
