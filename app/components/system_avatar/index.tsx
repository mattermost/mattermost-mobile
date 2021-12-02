// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {View as ViewConstants} from '@constants';

type Props = {
    theme: Theme;
}

const styles = StyleSheet.create({
    profilePictureContainer: {
        marginBottom: 5,
        marginRight: 10,
        marginTop: 10,
    },
});

const SystemAvatar = ({theme}: Props) => {
    return (
        <View style={styles.profilePictureContainer}>
            <CompassIcon
                name='mattermost'
                color={theme.centerChannelColor}
                size={ViewConstants.PROFILE_PICTURE_SIZE}
            />
        </View>
    );
};

export default SystemAvatar;
