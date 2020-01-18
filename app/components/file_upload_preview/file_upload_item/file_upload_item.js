// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text, View} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import {AnimatedCircularProgress} from 'react-native-circular-progress';

import {Client4} from 'mattermost-redux/client';

import FileAttachmentImage from 'app/components/file_attachment_list/file_attachment_image';
import FileAttachmentIcon from 'app/components/file_attachment_list/file_attachment_icon';
import FileUploadRetry from 'app/components/file_upload_preview/file_upload_retry';
import FileUploadRemove from 'app/components/file_upload_preview/file_upload_remove';
import mattermostBucket from 'app/mattermost_bucket';
import {buildFileUploadData, encodeHeaderURIStringToUTF8} from 'app/utils/file';
import {emptyFunction} from 'app/utils/general';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

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
        const {file} = this.props;
        if (file.loading) {
            this.downloadAndUploadFile(file);
        }
    }

    componentDidUpdate(prevProps) {
        const {file: prevFile} = prevProps;
        const {file} = this.props;

        if (prevFile.failed !== file.failed && file.loading) {
            this.downloadAndUploadFile(file);
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
            const data = response.file_infos.map((f) => {
                return {
                    ...f,
                    clientId: file.clientId,
                };
            });
            actions.uploadComplete(data, channelId, rootId);
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

    downloadAndUploadFile = async (file) => {
        const newFile = {...file};
        if (newFile.localPath.startsWith('http')) {
            try {
                newFile.localPath = await ImageCacheManager.cache(newFile.name, newFile.localPath, emptyFunction);
            } catch (e) {
                this.handleUploadError(e);
                return;
            }
        }

        this.uploadFile(newFile);
    }

    uploadFile = async (file) => {
        const {channelId} = this.props;
        const fileData = buildFileUploadData(file);

        const headers = {
            Authorization: `Bearer ${Client4.getToken()}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'multipart/form-data',
            'X-CSRF-Token': Client4.csrf,
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
        const styles = getStyleSheet(this.props.theme);
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
        const styles = getStyleSheet(theme);
        let filePreviewComponent;

        if (this.isImageType()) {
            filePreviewComponent = (
                <FileAttachmentImage
                    file={file}
                    theme={theme}
                />
            );
        } else {
            filePreviewComponent = (
                <View style={styles.filePreview}>
                    <FileAttachmentIcon
                        file={file}
                        theme={theme}
                        wrapperHeight={60}
                        wrapperWidth={60}
                    />
                </View>
            );
        }

        return (
            <View
                key={file.clientId}
                style={styles.preview}
            >
                <View style={styles.previewContainer}>
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
                            size={64}
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
                    theme={this.props.theme}
                    channelId={channelId}
                    clientId={file.clientId}
                    onPress={this.handleRemoveFile}
                    rootId={rootId}
                />
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    preview: {
        paddingTop: 12,
        marginLeft: 12,
    },
    previewContainer: {
        height: 64,
        width: 64,
        elevation: 10,
        borderRadius: 4,
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
        height: 64,
        justifyContent: 'center',
        position: 'absolute',
        width: 64,
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
    filePreview: {
        borderColor: changeOpacity(theme.centerChannelColor, 0.6),
        borderRadius: 5,
        borderWidth: 1,
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));
