// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    PixelRatio,
    Text,
    View,
    StyleSheet,
} from 'react-native';

import * as Utils from '@mm-redux/utils/file_utils';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {isDocument, isImage} from 'app/utils/file';
import {calculateDimensions} from 'app/utils/images';
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
        onLongPress: PropTypes.func,
        onPreviewPress: PropTypes.func,
        theme: PropTypes.object.isRequired,
        wrapperWidth: PropTypes.number,
        isSingleImage: PropTypes.bool,
        nonVisibleImagesCount: PropTypes.number,
        inViewPort: PropTypes.bool,
    };

    static defaultProps = {
        onPreviewPress: () => true,
        wrapperWidth: 300,
    };

    state = {
        resizeMode: 'cover',
    };

    componentWillUnmount() {
        if (this.transition) {
            clearTimeout(this.transition);
        }
    }

    handlePress = () => {
        this.props.onPreviewPress(this.props.index);
    };

    handlePreviewPress = () => {
        if (this.documentElement) {
            this.documentElement.handlePreviewPress();
        } else {
            this.props.onPreviewPress(this.props.index);
        }
    };

    renderFileInfo() {
        const {file, onLongPress, theme} = this.props;
        const style = getStyleSheet(theme);

        if (!file?.id) {
            return null;
        }

        return (
            <TouchableWithFeedback
                onPress={this.handlePress}
                onLongPress={onLongPress}
                type={'opacity'}
                style={style.attachmentContainer}
            >
                <React.Fragment>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        style={style.fileName}
                    >
                        {file.name.trim()}
                    </Text>
                    <View style={style.fileDownloadContainer}>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode='tail'
                            style={style.fileInfo}
                        >
                            {`${Utils.getFormattedFileSize(file)}`}
                        </Text>
                    </View>
                </React.Fragment>
            </TouchableWithFeedback>
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

    getImageDimensions = (file) => {
        const {isSingleImage, wrapperWidth} = this.props;
        const viewPortHeight = this.getViewPortHeight();

        if (isSingleImage) {
            return calculateDimensions(file?.height, file?.width, wrapperWidth, viewPortHeight);
        }

        return null;
    };

    getViewPortHeight = () => {
        const dimensions = Dimensions.get('window');
        const viewPortHeight = Math.max(dimensions.height, dimensions.width) * 0.45;

        return viewPortHeight;
    };

    render() {
        const {
            canDownloadFiles,
            file,
            theme,
            onLongPress,
            isSingleImage,
            nonVisibleImagesCount,
            inViewPort,
        } = this.props;
        const style = getStyleSheet(theme);

        let fileAttachmentComponent;
        if (isImage(file) || file.loading) {
            const imageDimensions = this.getImageDimensions(file);

            fileAttachmentComponent = (
                <TouchableWithFeedback
                    key={`${this.props.id}${file.loading}`}
                    onPress={this.handlePreviewPress}
                    onLongPress={onLongPress}
                    type={'opacity'}
                    style={{width: imageDimensions?.width}}
                >
                    <FileAttachmentImage
                        file={file || {}}
                        inViewPort={inViewPort}
                        imageDimensions={imageDimensions}
                        isSingleImage={isSingleImage}
                        resizeMode={this.state.resizeMode}
                        theme={theme}
                    />
                    {this.renderMoreImagesOverlay(nonVisibleImagesCount, theme)}
                </TouchableWithFeedback>
            );
        } else if (isDocument(file)) {
            fileAttachmentComponent = (
                <View style={[style.fileWrapper]}>
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
                <View style={[style.fileWrapper]}>
                    <View style={style.iconWrapper}>
                        <TouchableWithFeedback
                            onPress={this.handlePreviewPress}
                            onLongPress={onLongPress}
                            type={'opacity'}
                        >
                            <FileAttachmentIcon
                                file={file}
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
    const scale = Dimensions.get('window').width / 320;

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
            marginTop: 7.8,
            marginRight: 6,
            marginBottom: 8.2,
            marginLeft: 8,
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
            fontSize: Math.round(PixelRatio.roundToNearestPixel(24 * scale)),
            fontFamily: 'Open Sans',
            textAlign: 'center',
        },
    };
});
