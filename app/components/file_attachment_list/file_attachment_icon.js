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
import videoIcon from 'assets/images/icons/video.png';
import wordIcon from 'assets/images/icons/word.png';

const ICON_PATH_FROM_FILE_TYPE = {
    audio: audioIcon,
    code: codeIcon,
    image: imageIcon,
    other: genericIcon,
    patch: patchIcon,
    pdf: pdfIcon,
    presentation: pptIcon,
    spreadsheet: excelIcon,
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
    };

    static defaultProps = {
        backgroundColor: '#fff',
        iconHeight: 60,
        iconWidth: 60,
        wrapperHeight: 80,
        wrapperWidth: 80,
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
        const {backgroundColor, file, iconHeight, iconWidth, wrapperHeight, wrapperWidth} = this.props;
        const source = this.getFileIconPath(file);

        return (
            <View
                ref={this.handleCaptureRef}
                style={[styles.fileIconWrapper, {backgroundColor, height: wrapperHeight, width: wrapperWidth}]}
            >
                <Image
                    style={[styles.icon, {height: iconHeight, width: iconWidth}]}
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
        borderTopLeftRadius: 2,
        borderBottomLeftRadius: 2,
    },
    icon: {
        borderTopLeftRadius: 2,
        borderBottomLeftRadius: 2,
        backgroundColor: '#fff',
    },
});
