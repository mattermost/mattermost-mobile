// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import * as Utils from 'mattermost-redux/utils/file_utils.js';

import {isDocument, isGif} from 'app/utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import FileAttachmentDocument from './file_attachment_document';
import FileAttachmentIcon from './file_attachment_icon';
import FileAttachmentImage from './file_attachment_image';

export default class FileAttachment extends PureComponent {
    static propTypes = {
        deviceWidth: PropTypes.number.isRequired,
        file: PropTypes.object.isRequired,
        index: PropTypes.number.isRequired,
        onCaptureRef: PropTypes.func,
        onCapturePreviewRef: PropTypes.func,
        onInfoPress: PropTypes.func,
        onPreviewPress: PropTypes.func,
        theme: PropTypes.object.isRequired,
        navigator: PropTypes.object,
    };

    static defaultProps = {
        onInfoPress: () => true,
        onPreviewPress: () => true,
    };

    handleCaptureRef = (ref) => {
        const {onCaptureRef, index} = this.props;

        if (onCaptureRef) {
            onCaptureRef(ref, index);
        }
    };

    handleCapturePreviewRef = (ref) => {
        const {onCapturePreviewRef, index} = this.props;

        if (onCapturePreviewRef) {
            onCapturePreviewRef(ref, index);
        }
    };

    handlePreviewPress = () => {
        this.props.onPreviewPress(this.props.index);
    };

    renderFileInfo() {
        const {file, theme} = this.props;
        const {data} = file;
        const style = getStyleSheet(theme);

        if (!data || !data.id) {
            return null;
        }

        return (
            <View style={style.attachmentContainer}>
                <Text
                    numberOfLines={2}
                    ellipsizeMode='tail'
                    style={style.fileName}
                >
                    {file.caption.trim()}
                </Text>
                <View style={style.fileDownloadContainer}>
                    <Text
                        numberOfLines={2}
                        ellipsizeMode='tail'
                        style={style.fileInfo}
                    >
                        {`${data.extension.toUpperCase()} ${Utils.getFormattedFileSize(data)}`}
                    </Text>
                </View>
            </View>
        );
    }

    render() {
        const {
            deviceWidth,
            file,
            onInfoPress,
            theme,
            navigator,
        } = this.props;
        const {data} = file;
        const style = getStyleSheet(theme);

        let fileAttachmentComponent;
        if ((data && data.has_preview_image) || file.loading || isGif(data)) {
            fileAttachmentComponent = (
                <TouchableOpacity onPress={this.handlePreviewPress}>
                    <FileAttachmentImage
                        file={data || {}}
                        onCaptureRef={this.handleCaptureRef}
                        onCapturePreviewRef={this.handleCapturePreviewRef}
                        theme={theme}
                    />
                </TouchableOpacity>
            );
        } else if (isDocument(data)) {
            fileAttachmentComponent = (
                <FileAttachmentDocument
                    file={file}
                    navigator={navigator}
                    theme={theme}
                />
            );
        } else {
            fileAttachmentComponent = (
                <TouchableOpacity onPress={this.handlePreviewPress}>
                    <FileAttachmentIcon
                        file={data}
                        onCaptureRef={this.handleCaptureRef}
                        onCapturePreviewRef={this.handleCapturePreviewRef}
                        theme={theme}
                    />
                </TouchableOpacity>
            );
        }

        const width = deviceWidth * 0.72;

        return (
            <View style={[style.fileWrapper, {width}]}>
                {fileAttachmentComponent}
                <TouchableOpacity
                    onPress={onInfoPress}
                    style={style.fileInfoContainer}
                >
                    {this.renderFileInfo()}
                </TouchableOpacity>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        attachmentContainer: {
            flex: 1,
            justifyContent: 'center',
        },
        downloadIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            marginRight: 5,
        },
        fileDownloadContainer: {
            flexDirection: 'row',
            marginTop: 3,
        },
        fileInfo: {
            marginLeft: 2,
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        fileInfoContainer: {
            flex: 1,
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
        fileName: {
            flexDirection: 'column',
            flexWrap: 'wrap',
            marginLeft: 2,
            fontSize: 14,
            color: theme.centerChannelColor,
        },
        fileWrapper: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 10,
            marginRight: 10,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRadius: 2,
            maxWidth: 350,
        },
        circularProgress: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        circularProgressContent: {
            position: 'absolute',
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});
