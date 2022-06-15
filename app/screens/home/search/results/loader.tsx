// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {StyleSheet} from 'react-native';

import Loading from '@components/loading';
import {useTheme} from '@context/theme';

const styles = StyleSheet.create({
    loading: {
        position: 'absolute',
        margin: -18,
        top: '50%',
        left: '50%',
    },
});

const Loader = () => {
    const theme = useTheme();

    return (
        <Loading
            containerStyle={styles.loading}
            color={theme.buttonBg}
            size='large'
        />
    );
};

export default Loader;
