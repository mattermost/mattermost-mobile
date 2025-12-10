// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {StyleSheet, View} from 'react-native';

import ExpoImage from '@components/expo_image';
import FileIcon from '@components/files/file_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {EMOJI_ROW_MARGIN, EMOJI_SIZE} from '@constants/emoji';

type ImageEmojiProps = {
    onEmojiPress: (emoji: string) => void;
    file?: ExtractedFileInfo;
    imageUrl?: string;
    path: string;
}

const styles = StyleSheet.create(({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: EMOJI_SIZE,
        marginBottom: EMOJI_ROW_MARGIN,
    },
    emoji: {
        height: EMOJI_SIZE,
        width: EMOJI_SIZE,
    },
    imageEmoji: {
        width: 28,
        height: 28,
    },
}));

const ImageEmoji = ({file, imageUrl, onEmojiPress, path}: ImageEmojiProps) => {
    const onPress = useCallback(() => {
        onEmojiPress('');
    }, [onEmojiPress]);

    return (
        <View style={styles.row}>
            <View style={styles.emoji}>
                <TouchableWithFeedback onPress={onPress}>
                    <>
                        {Boolean(file) &&
                        <FileIcon
                            file={file}
                            iconSize={30}
                        />
                        }
                        {Boolean(imageUrl) &&
                        <ExpoImage
                            id={`emoji-${path}`}
                            source={{uri: imageUrl}}
                            style={styles.imageEmoji}
                        />
                        }
                    </>
                </TouchableWithFeedback>
            </View>
        </View>
    );
};
export default memo(ImageEmoji);
