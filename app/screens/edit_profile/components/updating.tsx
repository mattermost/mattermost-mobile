// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import Loading from '@components/loading';
import {useTheme} from '@context/theme';

const styles = StyleSheet.create({
    spinner: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
});

const Updating = () => {
    const theme = useTheme();

    return (
        <View
            style={styles.spinner}
        >
            <Loading
                color={theme.buttonBg}
            />
        </View>
    );
};

export default Updating;
