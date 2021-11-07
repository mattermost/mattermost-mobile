// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text} from 'react-native';

interface NotificationTitleProps {
    channelName: string;
}

const Title = ({channelName}: NotificationTitleProps) => {
    return (
        <Text
            numberOfLines={1}
            ellipsizeMode='tail'
            style={styles.title}
            testID='in_app_notification.title'
        >
            {channelName}
        </Text>
    );
};

const styles = StyleSheet.create({
    title: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'OpenSans-SemiBold',
    },
});

export default Title;
