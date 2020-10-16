// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View, StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import * as Utils from '@mm-redux/utils/file_utils';

const BLUE_ICON = '#338AFF';
const RED_ICON = '#ED522A';
const GREEN_ICON = '#1CA660';
const GRAY_ICON = '#999999';
const FAILED_ICON_NAME_AND_COLOR = ['jumbo-attachment-image-broken', GRAY_ICON];
const ICON_NAME_AND_COLOR_FROM_FILE_TYPE = {
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

export default class FileAttachmentIcon extends PureComponent {
    static propTypes = {
        backgroundColor: PropTypes.string,
        failed: PropTypes.bool,
        defaultImage: PropTypes.bool,
        smallImage: PropTypes.bool,
        file: PropTypes.object,
        iconColor: PropTypes.string,
        iconSize: PropTypes.number,
        theme: PropTypes.object,
    };

    static defaultProps = {
        failed: false,
        defaultImage: false,
        smallImage: false,
        iconSize: 48,
    };

    getFileIconNameAndColor(file) {
        if (this.props.failed) {
            return FAILED_ICON_NAME_AND_COLOR;
        }

        if (this.props.defaultImage) {
            if (this.props.smallImage) {
                return ICON_NAME_AND_COLOR_FROM_FILE_TYPE.smallImage;
            }

            return ICON_NAME_AND_COLOR_FROM_FILE_TYPE.image;
        }

        const fileType = Utils.getFileType(file);
        return ICON_NAME_AND_COLOR_FROM_FILE_TYPE[fileType] || ICON_NAME_AND_COLOR_FROM_FILE_TYPE.other;
    }

    render() {
        const {backgroundColor, file, iconSize, theme, iconColor} = this.props;
        const [iconName, defaultIconColor] = this.getFileIconNameAndColor(file);
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
    }
}

const styles = StyleSheet.create({
    fileIconWrapper: {
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
