// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
    StyleSheet,
} from 'react-native';

import * as Utils from 'mattermost-redux/utils/file_utils.js';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {isDocument, isGif} from 'app/utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import FileAttachmentDocument from './file_attachment_document';
import FileAttachmentIcon from './file_attachment_icon';
import FileAttachmentImage from './file_attachment_image';

export default class FileAttachment extends PureComponent {
    static propTypes = {
        canDownloadFiles: PropTypes.bool.isRequired,
        file: PropTypes.object.isRequired,
        id: PropTypes.string.isRequired,
        index: PropTypes.number.isRequired,
        onCaptureRef: PropTypes.func,
        onLongPress: PropTypes.func,
        onPreviewPress: PropTypes.func,
        theme: PropTypes.object.isRequired,
        wrapperWidth: PropTypes.number,
        isSingleImage: PropTypes.bool,
        nonVisibleImagesCount: PropTypes.number,
    };

    static defaultProps = {
        onPreviewPress: () => true,
        wrapperWidth: 300,
    };

    handleCaptureRef = (ref) => {
        const {onCaptureRef, index} = this.props;

        if (onCaptureRef) {
            onCaptureRef(ref, index);
        }
    };

    handlePreviewPress = () => {
        if (this.documentElement) {
            this.documentElement.handlePreviewPress();
        } else {
            this.props.onPreviewPress(this.props.index);
        }
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
                        {`${Utils.getFormattedFileSize(data)}`}
                    </Text>
                </View>
            </View>
        );
    }

    setDocumentRef = (ref) => {
        this.documentElement = ref;
    };

    renderMoreImagesOverlay = (value) => {
        if (!value) {
            return null;
        }

        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.moreImagesWrapper}>
                <Text style={style.moreImagesText}>
                    {`+${value}`}
                </Text>
            </View>
        );
    };

    render() {
        const {
            canDownloadFiles,
            file,
            theme,
            onLongPress,
            isSingleImage,
            nonVisibleImagesCount,
            wrapperWidth,
        } = this.props;
        const {data} = file;
        const style = getStyleSheet(theme);

        let fileAttachmentComponent;
        if ((data && data.has_preview_image) || file.loading || isGif(data)) {
            fileAttachmentComponent = (
                <TouchableWithFeedback
                    key={`${this.props.id}${file.loading}`}
                    onPress={this.handlePreviewPress}
                    onLongPress={onLongPress}
                    type={'opacity'}
                >
                    <FileAttachmentImage
                        file={data || {}}
                        onCaptureRef={this.handleCaptureRef}
                        theme={theme}
                        isSingleImage={isSingleImage}
                    />
                    {this.renderMoreImagesOverlay(nonVisibleImagesCount, theme)}
                </TouchableWithFeedback>
            );
        } else if (isDocument(data)) {
            fileAttachmentComponent = (
                <View style={[style.fileWrapper, {width: wrapperWidth}]}>
                    <View style={style.iconWrapper}>
                        <FileAttachmentDocument
                            ref={this.setDocumentRef}
                            canDownloadFiles={canDownloadFiles}
                            file={file}
                            onLongPress={onLongPress}
                            theme={theme}
                        />
                    </View>
                    {this.renderFileInfo()}
                </View>
            );
        } else {
            fileAttachmentComponent = (
                <View style={[style.fileWrapper, {width: wrapperWidth}]}>
                    <View style={style.iconWrapper}>
                        <TouchableWithFeedback
                            onPress={this.handlePreviewPress}
                            onLongPress={onLongPress}
                            type={'opacity'}
                        >
                            <FileAttachmentIcon
                                file={data}
                                onCaptureRef={this.handleCaptureRef}
                                theme={theme}
                            />
                        </TouchableWithFeedback>
                    </View>
                    {this.renderFileInfo()}
                </View>
            );
        }

        return fileAttachmentComponent;
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
            fontSize: 14,
            color: theme.centerChannelColor,
        },
        fileName: {
            flexDirection: 'column',
            flexWrap: 'wrap',
            fontSize: 14,
            fontWeight: '600',
            color: theme.centerChannelColor,
            paddingRight: 10,
        },
        fileWrapper: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 10,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.4),
            borderRadius: 5,
        },
        iconWrapper: {
            marginHorizontal: 20,
            marginVertical: 10,
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
        moreImagesWrapper: {
            ...StyleSheet.absoluteFill,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: 5,
        },
        moreImagesText: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 24,
            fontFamily: 'Open Sans',
            textAlign: 'center',
        },
    };
});
