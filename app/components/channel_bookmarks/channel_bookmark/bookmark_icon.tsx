// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image, type ImageStyle} from 'expo-image';
import React, {useState, useCallback} from 'react';
import {type StyleProp, type TextStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import FileIcon from '@components/files/file_icon';
import {useTheme} from '@context/theme';

type Props = {
    emoji?: string;
    emojiSize: number;
    emojiStyle?: StyleProp<TextStyle>;
    file?: FileInfo | ExtractedFileInfo;
    iconSize: number;
    imageStyle?: StyleProp<ImageStyle>;
    imageUrl?: string;
    genericStyle: StyleProp<TextStyle>;
}

const BookmarkIcon = ({emoji, emojiSize, emojiStyle, file, genericStyle, iconSize, imageStyle, imageUrl}: Props) => {
    const theme = useTheme();
    const [hasImageError, setHasImageError] = useState(false);

    const handleImageError = useCallback(() => {
        setHasImageError(true);
    }, []);

    if (file && !emoji && !hasImageError) {
        return (
            <FileIcon
                testID='bookmark-file-icon'
                file={file}
                iconSize={iconSize}
                smallImage={true}
            />
        );
    } else if (imageUrl && !emoji && !hasImageError) {
        return (
            <Image
                testID='bookmark-image'
                source={{uri: imageUrl}}
                style={imageStyle}
                onError={handleImageError}
            />
        );
    } else if (emoji) {
        const sanitizedEmoji = emoji.replace(/:/g, '');
        return (
            <Emoji
                testID='bookmark-emoji'
                emojiName={sanitizedEmoji}
                size={emojiSize}
                textStyle={emojiStyle}
            />
        );
    }

    return (
        <CompassIcon
            name='book-outline'
            size={22}
            color={theme.centerChannelColor}
            style={genericStyle}
            testID='bookmark-generic-icon'
        />
    );
};

export default BookmarkIcon;
