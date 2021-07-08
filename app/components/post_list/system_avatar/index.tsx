// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {ViewTypes} from '@constants';

import type {Theme} from '@mm-redux/types/preferences';

type Props = {
    theme: Theme;
}

const styles = StyleSheet.create({
    profilePictureContainer: {
        marginBottom: 5,
        marginLeft: 12,
        marginRight: 13,
        marginTop: 10,
    },
});

const SystemAvatar = ({theme}: Props) => {
    return (
        <View style={styles.profilePictureContainer}>
            <CompassIcon
                name='mattermost'
                color={theme.centerChannelColor}
                size={ViewTypes.PROFILE_PICTURE_SIZE}
            />
        </View>
    );
};

export default SystemAvatar;
