// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ScrollView} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        contentContainerStyle: {
            marginTop: 8,
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
