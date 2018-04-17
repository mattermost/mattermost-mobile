// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    PermissionsAndroid,
    StyleSheet,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import RNFetchBlob from 'react-native-fetch-blob';
import {intlShape} from 'react-intl';

import {Client4} from 'mattermost-redux/client';

import {DeviceTypes} from 'app/constants/';
import FormattedText from 'app/components/formatted_text';
import {isDocument, isVideo} from 'app/utils/file';
import {emptyFunction} from 'app/utils/general';

const {DOCUMENTS_PATH, VIDEOS_PATH} = DeviceTypes;
const EXTERNAL_STORAGE_PERMISSION = 'android.permission.WRITE_EXTERNAL_STORAGE';
const HEADER_HEIGHT = 64;
const OPTION_LIST_WIDTH = 39;

export default class Downloader extends PureComponent {
    static propTypes = {
        file: PropTypes.object.isRequired,
        onDownloadCancel: PropTypes.func,
        onDownloadStart: PropTypes.func,
        onDownloadSuccess: PropTypes.func,
        show: PropTypes.bool,
    };

    static defaultProps = {
        onCancelPress: emptyFunction,
        onDownloadStart: emptyFunction,
        onDownloadSuccess: emptyFunction,
        show: false,
    };

    static contextTypes = {
        intl: intlShape,
    };

    checkForPermissions = async () => {
        const canWriteToStorage = await PermissionsAndroid.check(EXTERNAL_STORAGE_PERMISSION);
        if (!canWriteToStorage) {
            const {intl} = this.context;
            const description = intl.formatMessage({
                id: 'mobile.downloader.android_permission',
                defaultMessage: 'We need access to the downloads folder to save files.',
            });

            const permissionRequest = await PermissionsAndroid.request(EXTERNAL_STORAGE_PERMISSION, description);
            return permissionRequest === 'granted';
        }

        return true;
    };

    handleDownload = async () => {
        const {file, onDownloadCancel, onDownloadStart, onDownloadSuccess} = this.props;
        const {intl} = this.context;
        const {data} = file;

        const canWriteToStorage = await this.checkForPermissions();
        if (!canWriteToStorage) {
            onDownloadCancel();
            return;
        }

        try {
            const started = intl.formatMessage({
                id: 'mobile.downloader.android_started',
                defaultMessage: 'Download started',
            });
            const title = intl.formatMessage({
                id: 'mobile.downloader.android_success',
                defaultMessage: 'download successful',
            });
            const complete = intl.formatMessage({
                id: 'mobile.downloader.android_complete',
                defaultMessage: 'Download complete',
            });

            ToastAndroid.show(started, ToastAndroid.SHORT);
            onDownloadStart();

            const dest = `${RNFetchBlob.fs.dirs.DownloadDir}/${data.id}-${file.caption}`;
            let downloadFile = true;

            if (data.localPath) {
                const exists = await RNFetchBlob.fs.exists(data.localPath);

                if (exists) {
                    downloadFile = false;
                    await RNFetchBlob.fs.cp(data.localPath, dest);
                }
            } else if (isVideo(data)) {
                const path = `${VIDEOS_PATH}/${data.id}-${file.caption}`;
                const exists = await RNFetchBlob.fs.exists(path);

                if (exists) {
                    downloadFile = false;
                    await RNFetchBlob.fs.cp(path, dest);
                }
            } else if (isDocument(data)) {
                const path = `${DOCUMENTS_PATH}/${data.id}-${file.caption}`;
                const exists = await RNFetchBlob.fs.exists(path);

                if (exists) {
                    downloadFile = false;
                    await RNFetchBlob.fs.cp(path, dest);
                }
            }

            if (downloadFile) {
                const imageUrl = Client4.getFileUrl(data.id);

                const task = RNFetchBlob.config({
                    fileCache: true,
                    addAndroidDownloads: {
                        useDownloadManager: true,
                        notification: true,
                        path: dest,
                        title: `${file.caption} ${title}`,
                        mime: data.mime_type,
                        description: data.name,
                        mediaScannable: true,
                    },
                }).fetch('GET', imageUrl, {
                    Authorization: `Bearer ${Client4.token}`,
                });

                await task;
            }

            ToastAndroid.show(complete, ToastAndroid.SHORT);
            onDownloadSuccess();
        } catch (error) {
            const failed = intl.formatMessage({
                id: 'mobile.downloader.android_failed',
                defaultMessage: 'Download failed',
            });

            ToastAndroid.show(failed, ToastAndroid.SHORT);
            onDownloadCancel();
        }
    };

    render() {
        const {show} = this.props;

        return (
            <View style={[styles.wrapper, {height: show ? OPTION_LIST_WIDTH : 0}]}>
                <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={this.handleDownload}
                >
                    <FormattedText
                        id='file_attachment.download'
                        defaultMessage='Download'
                        style={styles.downloadButtonText}
                    />
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    downloadButton: {
        flex: 1,
        justifyContent: 'center',
    },
    downloadButtonText: {
        color: 'white',
        fontSize: 15,
        paddingLeft: 15,
    },
    wrapper: {
        position: 'absolute',
        backgroundColor: '#575757',
        top: HEADER_HEIGHT,
        right: 0,
        width: 150,
    },
});
