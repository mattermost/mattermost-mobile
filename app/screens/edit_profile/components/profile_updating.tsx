// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';

import Loading from '@components/loading';
import StatusBar from '@components/status_bar';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const ProfileUpdating = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <SafeAreaView style={style.flex}>
            <StatusBar theme={theme}/>
            <Loading color={theme.centerChannelColor}/>
        </SafeAreaView>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        flex: {
            flex: 1,
        },
    };
});

export default ProfileUpdating;
