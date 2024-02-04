// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback} from 'react';
import {type StyleProp, type TextStyle, type ViewStyle} from 'react-native';
import FastImage, {type ImageStyle} from 'react-native-fast-image';

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
    genericStyle: StyleProp<ViewStyle>;
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
                file={file}
                iconSize={iconSize}
                smallImage={true}
            />
        );
    } else if (imageUrl && !emoji && !hasImageError) {
        return (
            <FastImage
                source={{uri: imageUrl}}
                style={imageStyle}
                onError={handleImageError}
            />
        );
    } else if (emoji) {
        return (
            <Emoji
                emojiName={emoji!}
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
        />
    );
};

export default BookmarkIcon;
