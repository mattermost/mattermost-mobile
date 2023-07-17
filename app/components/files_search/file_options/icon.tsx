// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View, StyleSheet} from 'react-native';

import FileIcon from '@components/files/file_icon';
import ImageFile from '@components/files/image_file';
import VideoFile from '@components/files/video_file';
import {isImage, isVideo} from '@utils/file';

export const ICON_SIZE = 72;

const styles = StyleSheet.create({
    imageVideo: {
        height: ICON_SIZE,
        width: ICON_SIZE,
    },
});

type Props = {
    fileInfo: FileInfo;
}
const Icon = ({fileInfo}: Props) => {
    switch (true) {
        case isImage(fileInfo):
            return (
                <View style={styles.imageVideo}>
                    <ImageFile
                        file={fileInfo}
                        inViewPort={true}
                        resizeMode={'cover'}
                    />
                </View>
            );
        case isVideo(fileInfo):
            return (
                <View style={styles.imageVideo}>
                    <VideoFile
                        file={fileInfo}
                        resizeMode={'cover'}
                        inViewPort={true}
                        index={0}
                        wrapperWidth={78}
                    />
                </View>
            );
        default:
            return (
                <FileIcon
                    file={fileInfo}
                    iconSize={72}
                />
            );
    }
};

export default Icon;
