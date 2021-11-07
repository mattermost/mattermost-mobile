// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

interface NotificationServerProps {
    serverName: string;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'flex-start',
        marginTop: 5,
    },
    text: {
        color: 'rgba(255, 255, 255, 0.64)',
        fontFamily: 'OpenSans',
        fontSize: 10,
    },
});

const Server = ({serverName}: NotificationServerProps) => {
    return (
        <View style={styles.container}>
            <Text
                numberOfLines={1}
                ellipsizeMode='tail'
                style={styles.text}
                testID='in_app_notification.title'
            >
                {serverName}
            </Text>
        </View>
    );
};

export default Server;
