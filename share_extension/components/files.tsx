// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {Preferences} from '@mm-redux/constants';
import {changeOpacity} from '@utils/theme';

import ImageFile from './image_file';
import OtherFile from './other_file';
import VideoFile from './video_file';

interface FilesProps {
    files: Array<ShareFileInfo>;
}

const theme = Preferences.THEMES.default;

const Files = ({files}: FilesProps) => {
    const elements = files.map((file, index) => {
        let component;
        const key = `item-${index}`;

        if (file.type.startsWith('image')) {
            component = (
                <ImageFile
                    key={key}
                    uri={file.fullPath}
                />
            );
        } else if (file.type.startsWith('video')) {
            component = (
                <VideoFile
                    key={key}
                    uri={file.fullPath}
                />
            );
        } else {
            component = (
                <OtherFile
                    extension={file.extension}
                    key={key}
                />
            );
        }

        return (
            <View
                style={styles.container}
                key={key}
            >
                {component}
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={styles.filename}
                >
                    {`${file.size} - ${file.filename}`}
                </Text>
            </View>
        );
    });

    return (
        <>
            {elements}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRadius: 4,
        borderWidth: 1,
        flexDirection: 'row',
        height: 48,
        marginBottom: 10,
        width: '100%',
    },
    filename: {
        color: changeOpacity(theme.centerChannelColor, 0.5),
        fontSize: 13,
        flex: 1,
    },
});

export default Files;
