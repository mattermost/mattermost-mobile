// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, StyleSheet, Text, View} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import {AnimatedCircularProgress} from 'react-native-circular-progress';

import {Client4} from 'mattermost-redux/client';

import FileAttachmentImage from 'app/components/file_attachment_list/file_attachment_image';
import FileAttachmentIcon from 'app/components/file_attachment_list/file_attachment_icon';
import FileUploadRetry from 'app/components/file_upload_preview/file_upload_retry';
import FileUploadRemove from 'app/components/file_upload_preview/file_upload_remove';
import mattermostBucket from 'app/mattermost_bucket';
import {buildFileUploadData, encodeHeaderURIStringToUTF8} from 'app/utils/file';

export default class FileUploadItem extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleRemoveFile: PropTypes.func.isRequired,
            retryFileUpload: PropTypes.func.isRequired,
            uploadComplete: PropTypes.func.isRequired,
            uploadFailed: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        file: PropTypes.object.isRequired,
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    state = {
        progress: 0,
    };

    componentDidMount() {
        if (this.props.file.loading) {
            this.uploadFile();
        }
    }

    componentWillReceiveProps(nextProps) {
        const {file} = this.props;
        const {file: nextFile} = nextProps;

        if (file.failed !== nextFile.failed && nextFile.loading) {
            this.uploadFile();
        }
    }

    handleRetryFileUpload = (file) => {
        if (!file.failed) {
            return;
        }

        this.props.actions.retryFileUpload(file, this.props.rootId);
    };

    handleRemoveFile = (clientId, channelId, rootId) => {
        const {handleRemoveFile} = this.props.actions;
        if (this.uploadPromise) {
            this.uploadPromise.cancel(() => {
                this.canceled = true;
                handleRemoveFile(clientId, channelId, rootId);
            });
        } else {
            handleRemoveFile(clientId, channelId, rootId);
        }
    };

    handleUploadCompleted = (res) => {
        const {actions, channelId, file, rootId} = this.props;
        const response = JSON.parse(res.data);
        if (res.respInfo.status === 200 || res.respInfo.status === 201) {
            this.setState({progress: 100}, () => {
                const data = response.file_infos.map((f) => {
                    return {
                        ...f,
                        clientId: file.clientId,
                    };
                });
                actions.uploadComplete(data, channelId, rootId);
            });
        } else {
            actions.uploadFailed([file.clientId], channelId, rootId, response.message);
        }
        this.uploadPromise = null;
    };

    handleUploadError = (error) => {
        const {actions, channelId, file, rootId} = this.props;
        if (!this.canceled) {
            actions.uploadFailed([file.clientId], channelId, rootId, error);
        }
        this.uploadPromise = null;
    };

    handleUploadProgress = (loaded, total) => {
        this.setState({progress: Math.floor((loaded / total) * 100)});
    };

    isImageType = () => {
        const {file} = this.props;

        if (file.has_preview_image || file.mime_type === 'image/gif' ||
            (file.localPath && file.type && file.type.includes('image'))) {
            return true;
        }

        return false;
    };

    uploadFile = async () => {
        const {channelId, file} = this.props;
        const fileData = buildFileUploadData(file);

        const headers = {
            Authorization: `Bearer ${Client4.getToken()}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'multipart/form-data',
        };

        const fileInfo = {
            name: 'files',
            filename: encodeHeaderURIStringToUTF8(fileData.name),
            data: RNFetchBlob.wrap(file.localPath.replace('file://', '')),
            type: fileData.type,
        };

        const data = [
            {name: 'channel_id', data: channelId},
            {name: 'client_ids', data: file.clientId},
            fileInfo,
        ];

        Client4.trackEvent('api', 'api_files_upload');

        const certificate = await mattermostBucket.getPreference('cert');
        const options = {
            timeout: 10000,
            certificate,
        };
        this.uploadPromise = RNFetchBlob.config(options).fetch('POST', Client4.getFilesRoute(), headers, data);
        this.uploadPromise.uploadProgress(this.handleUploadProgress);
        this.uploadPromise.then(this.handleUploadCompleted).catch(this.handleUploadError);
    };

    renderProgress = (fill) => {
        const realFill = Number(fill.toFixed(0));

        return (
            <View style={styles.progressContent}>
                <View style={styles.progressCirclePercentage}>
                    <Text style={styles.progressText}>
                        {`${realFill}%`}
                    </Text>
                </View>
            </View>
        );
    };

    render() {
        const {
            channelId,
            file,
            rootId,
            theme,
        } = this.props;
        const {progress} = this.state;
        let filePreviewComponent;

        if (this.isImageType()) {
            filePreviewComponent = (
                <FileAttachmentImage
                    file={file}
                    imageSize='fullsize'
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
                    theme={theme}
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
                style={styles.preview}
            >
                <View style={styles.previewShadow}>
                    {filePreviewComponent}
                    {file.failed &&
                    <FileUploadRetry
                        file={file}
                        onPress={this.handleRetryFileUpload}
                    />
                    }
                    {file.loading && !file.failed &&
                    <View style={styles.progressCircleContent}>
                        <AnimatedCircularProgress
                            size={100}
                            fill={progress}
                            width={4}
                            backgroundColor='rgba(255, 255, 255, 0.5)'
                            tintColor='white'
                            rotation={0}
                            style={styles.progressCircle}
                        >
                            {this.renderProgress}
                        </AnimatedCircularProgress>
                    </View>
                    }
                </View>
                <FileUploadRemove
                    channelId={channelId}
                    clientId={file.clientId}
                    onPress={this.handleRemoveFile}
                    rootId={rootId}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
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
    progressCircle: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        width: '100%',
    },
    progressCircleContent: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        height: 100,
        justifyContent: 'center',
        position: 'absolute',
        width: 100,
    },
    progressCirclePercentage: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    progressContent: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        left: 0,
        position: 'absolute',
        width: '100%',
    },
    progressText: {
        color: 'white',
        fontSize: 18,
    },
});
