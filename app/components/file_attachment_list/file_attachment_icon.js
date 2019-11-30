// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    View,
    StyleSheet,
} from 'react-native';

import * as Utils from 'mattermost-redux/utils/file_utils';

import audioIcon from 'assets/images/icons/audio.png';
import codeIcon from 'assets/images/icons/code.png';
import excelIcon from 'assets/images/icons/excel.png';
import genericIcon from 'assets/images/icons/generic.png';
import imageIcon from 'assets/images/icons/image.png';
import patchIcon from 'assets/images/icons/patch.png';
import pdfIcon from 'assets/images/icons/pdf.png';
import pptIcon from 'assets/images/icons/ppt.png';
import textIcon from 'assets/images/icons/text.png';
import videoIcon from 'assets/images/icons/video.png';
import wordIcon from 'assets/images/icons/word.png';

import {ATTACHMENT_ICON_HEIGHT, ATTACHMENT_ICON_WIDTH} from 'app/constants/attachment';
import {changeOpacity} from 'app/utils/theme';

const ICON_PATH_FROM_FILE_TYPE = {
    audio: audioIcon,
    code: codeIcon,
    image: imageIcon,
    other: genericIcon,
    patch: patchIcon,
    pdf: pdfIcon,
    presentation: pptIcon,
    spreadsheet: excelIcon,
    text: textIcon,
    video: videoIcon,
    word: wordIcon,
};

export default class FileAttachmentIcon extends PureComponent {
    static propTypes = {
        backgroundColor: PropTypes.string,
        file: PropTypes.object.isRequired,
        iconHeight: PropTypes.number,
        iconWidth: PropTypes.number,
        onCaptureRef: PropTypes.func,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number,
        theme: PropTypes.object,
    };

    static defaultProps = {
        iconHeight: ATTACHMENT_ICON_HEIGHT,
        iconWidth: ATTACHMENT_ICON_WIDTH,
        wrapperHeight: ATTACHMENT_ICON_HEIGHT,
        wrapperWidth: ATTACHMENT_ICON_WIDTH,
    };

    getFileIconPath(file) {
        const fileType = Utils.getFileType(file);
        return ICON_PATH_FROM_FILE_TYPE[fileType] || ICON_PATH_FROM_FILE_TYPE.other;
    }

    handleCaptureRef = (ref) => {
        const {onCaptureRef} = this.props;

        if (onCaptureRef) {
            onCaptureRef(ref);
        }
    };

    render() {
        const {backgroundColor, file, iconHeight, iconWidth, wrapperHeight, wrapperWidth, theme} = this.props;
        const source = this.getFileIconPath(file);
        const bgColor = backgroundColor || theme.centerChannelBg || 'transparent';

        return (
            <View
                ref={this.handleCaptureRef}
                style={[styles.fileIconWrapper, {backgroundColor: bgColor, height: wrapperHeight, width: wrapperWidth}]}
            >
                <Image
                    style={{maxHeight: iconHeight, maxWidth: iconWidth, tintColor: changeOpacity(theme.centerChannelColor, 20)}}
                    source={source}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    fileIconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
