// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import Video from 'react-native-video';

interface VideoFileProps {
    uri: string;
}

const VideoFile = ({uri}: VideoFileProps) => {
    return (
        <View style={styles.container}>
            <Video
                style={styles.video}
                resizeMode='cover'
                source={{uri}}
                volume={0}
                paused={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        height: 48,
        marginRight: 10,
        width: 48,
        overflow: 'hidden',
    },
    video: {
        borderBottomLeftRadius: 4,
        borderTopLeftRadius: 4,
        alignItems: 'center',
        height: 46,
        justifyContent: 'center',
        overflow: 'hidden',
        width: 48,
    },
});

export default VideoFile;
