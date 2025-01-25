// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {getFileType} from '@utils/file';

type FileIconProps = {
    backgroundColor?: string;
    defaultImage?: boolean;
    failed?: boolean;
    file?: FileInfo | ExtractedFileInfo;
    iconColor?: string;
    iconSize?: number;
    smallImage?: boolean;
    testID?: string;
}

const BLUE_ICON = '#338AFF';
const RED_ICON = '#ED522A';
const GREEN_ICON = '#1CA660';
const GRAY_ICON = '#999999';
const FAILED_ICON_NAME_AND_COLOR = ['file-image-broken-outline-large', GRAY_ICON];
const ICON_NAME_AND_COLOR_FROM_FILE_TYPE: Record<string, string[]> = {
    audio: ['file-audio-outline-large', BLUE_ICON],
    code: ['file-code-outline-large', BLUE_ICON],
    image: ['file-image-outline-large', BLUE_ICON],
    smallImage: ['image-outline', BLUE_ICON],
    other: ['file-generic-outline-large', BLUE_ICON],
    patch: ['file-patch-outline-large', BLUE_ICON],
    pdf: ['file-pdf-outline-large', RED_ICON],
    presentation: ['file-powerpoint-outline-large', RED_ICON],
    spreadsheet: ['file-excel-outline-large', GREEN_ICON],
    text: ['file-text-outline-large', GRAY_ICON],
    video: ['file-video-outline-large', BLUE_ICON],
    word: ['file-word-outline-large', BLUE_ICON],
    zip: ['file-zip-outline-large', BLUE_ICON],
};

const styles = StyleSheet.create({
    fileIconWrapper: {
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const FileIcon = ({
    backgroundColor, defaultImage = false, failed = false, file,
    iconColor, iconSize = 48, smallImage = false, testID = 'file-icon',
}: FileIconProps) => {
    const theme = useTheme();
    const getFileIconNameAndColor = () => {
        if (failed) {
            return FAILED_ICON_NAME_AND_COLOR;
        }

        if (defaultImage) {
            if (smallImage) {
                return ICON_NAME_AND_COLOR_FROM_FILE_TYPE.smallImage;
            }

            return ICON_NAME_AND_COLOR_FROM_FILE_TYPE.image;
        }

        if (file) {
            const fileType = getFileType(file);
            return ICON_NAME_AND_COLOR_FROM_FILE_TYPE[fileType] || ICON_NAME_AND_COLOR_FROM_FILE_TYPE.other;
        }

        return ICON_NAME_AND_COLOR_FROM_FILE_TYPE.other;
    };

    const [iconName, defaultIconColor] = getFileIconNameAndColor();
    const color = iconColor || defaultIconColor;
    const bgColor = backgroundColor || theme?.centerChannelBg || 'transparent';

    return (
        <View
            style={[styles.fileIconWrapper, {backgroundColor: bgColor}]}
            testID={testID}
        >
            <CompassIcon
                name={iconName}
                size={iconSize}
                color={color}
            />
        </View>
    );
};

export default FileIcon;
