// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import FileAttachmentImage from 'app/components/file_attachment_list/file_attachment_image';
import FileAttachmentIcon from 'app/components/file_attachment_list/file_attachment_icon';

import FileUploadRetry from './file_upload_retry';
import FileUploadRemove from './file_upload_remove';

export default class FileUploadPreview extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addFileToFetchCache: PropTypes.func.isRequired,
            handleRemoveFile: PropTypes.func.isRequired,
            retryFileUpload: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        channelIsLoading: PropTypes.bool,
        createPostRequestStatus: PropTypes.string.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        fetchCache: PropTypes.object.isRequired,
        files: PropTypes.array.isRequired,
        inputHeight: PropTypes.number.isRequired,
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
        filesUploadingForCurrentChannel: PropTypes.bool.isRequired,
        showFileMaxWarning: PropTypes.bool.isRequired,
    };

    handleRetryFileUpload = (file) => {
        if (!file.failed) {
            return;
        }

        this.props.actions.retryFileUpload(file, this.props.rootId);
    };

    buildFilePreviews = () => {
        return this.props.files.map((file) => {
            let filePreviewComponent;
            if (file.loading | (file.has_preview_image || file.mime_type === 'image/gif')) {
                filePreviewComponent = (
                    <FileAttachmentImage
                        addFileToFetchCache={this.props.actions.addFileToFetchCache}
                        fetchCache={this.props.fetchCache}
                        file={file}
                        imageHeight={100}
                        imageWidth={100}
                        wrapperHeight={100}
                        wrapperWidth={100}
                    />
                );
            } else {
                filePreviewComponent = (
                    <FileAttachmentIcon
                        file={file}
                        theme={this.props.theme}
                        imageHeight={100}
                        imageWidth={100}
                        wrapperHeight={100}
                        wrapperWidth={100}
                    />
                );
            }
            return (
                <View
                    key={file.clientId}
                    style={style.preview}
                >
                    <View style={style.previewShadow}>
                        {filePreviewComponent}
                        {file.failed &&
                        <FileUploadRetry
                            file={file}
                            onPress={this.handleRetryFileUpload}
                        />
                        }
                    </View>
                    <FileUploadRemove
                        channelId={this.props.channelId}
                        clientId={file.clientId}
                        onPress={this.props.actions.handleRemoveFile}
                        rootId={this.props.rootId}
                    />
                </View>
            );
        });
    };

    render() {
        const {
            showFileMaxWarning,
            channelIsLoading,
            filesUploadingForCurrentChannel,
            deviceHeight,
            files,
        } = this.props;
        if (channelIsLoading || (!files.length && !filesUploadingForCurrentChannel)) {
            return null;
        }

        return (
            <View>
                <View style={[style.container, {height: deviceHeight}]}>
                    <ScrollView
                        horizontal={true}
                        style={style.scrollView}
                        contentContainerStyle={style.scrollViewContent}
                    >
                        {this.buildFilePreviews()}
                    </ScrollView>
                    {showFileMaxWarning && (
                        <FormattedText
                            style={style.warning}
                            id='mobile.file_upload.max_warning'
                            defaultMessage='Uploads limited to 5 files maximum.'
                        />
                    )}

                </View>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        left: 0,
        bottom: 0,
        position: 'absolute',
        width: '100%',
    },
    preview: {
        justifyContent: 'flex-end',
        height: 115,
        width: 115,
    },
    previewShadow: {
        height: 100,
        width: 100,
        elevation: 10,
        ...Platform.select({
            ios: {
                backgroundColor: '#fff',
                shadowColor: '#000',
                shadowOpacity: 0.5,
                shadowRadius: 4,
                shadowOffset: {
                    width: 0,
                    height: 0,
                },
            },
        }),
    },
    scrollView: {
        flex: 1,
        marginBottom: 10,
    },
    scrollViewContent: {
        alignItems: 'flex-end',
        marginLeft: 14,
    },
    warning: {
        color: 'white',
        marginLeft: 14,
        marginBottom: 10,
    },
});
