// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {getFileType} from '@mm-redux/utils/file_utils';

import type {FileInfo} from '@mm-redux/types/files';
import type {Theme} from '@mm-redux/types/preferences';

type FileIconProps = {
    backgroundColor?: string;
    defaultImage?: boolean;
    failed?: boolean;
    file?: FileInfo;
    iconColor?: string;
    iconSize?: number;
    smallImage?: boolean;
    theme: Theme;
}

const BLUE_ICON = '#338AFF';
const RED_ICON = '#ED522A';
const GREEN_ICON = '#1CA660';
const GRAY_ICON = '#999999';
const FAILED_ICON_NAME_AND_COLOR = ['jumbo-attachment-image-broken', GRAY_ICON];
const ICON_NAME_AND_COLOR_FROM_FILE_TYPE: Record<string, string[]> = {
    audio: ['jumbo-attachment-audio', BLUE_ICON],
    code: ['jumbo-attachment-code', BLUE_ICON],
    image: ['jumbo-attachment-image', BLUE_ICON],
    smallImage: ['image-outline', BLUE_ICON],
    other: ['jumbo-attachment-generic', BLUE_ICON],
    patch: ['jumbo-attachment-patch', BLUE_ICON],
    pdf: ['jumbo-attachment-pdf', RED_ICON],
    presentation: ['jumbo-attachment-powerpoint', RED_ICON],
    spreadsheet: ['jumbo-attachment-excel', GREEN_ICON],
    text: ['jumbo-attachment-text', GRAY_ICON],
    video: ['jumbo-attachment-video', BLUE_ICON],
    word: ['jumbo-attachment-word', BLUE_ICON],
    zip: ['jumbo-attachment-zip', BLUE_ICON],
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
    iconColor, iconSize = 48, smallImage = false, theme,
}: FileIconProps) => {
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
        <View style={[styles.fileIconWrapper, {backgroundColor: bgColor}]}>
            <CompassIcon
                name={iconName}
                size={iconSize}
                color={color}
            />
        </View>
    );
};

export default FileIcon;
