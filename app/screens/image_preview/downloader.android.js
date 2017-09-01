// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    PermissionsAndroid,
    StyleSheet,
    ToastAndroid,
    TouchableOpacity,
    View
} from 'react-native';
import RNFetchBlob from 'react-native-fetch-blob';

import {Client4} from 'mattermost-redux/client';

import FormattedText from 'app/components/formatted_text';
import {emptyFunction} from 'app/utils/general';

const EXTERNAL_STORAGE_PERMISSION = 'android.permission.WRITE_EXTERNAL_STORAGE';
const HEADER_HEIGHT = 64;
const OPTION_LIST_WIDTH = 39;

export default class Downloader extends PureComponent {
    static propTypes = {
        file: PropTypes.object.isRequired,
        onDownloadCancel: PropTypes.func,
        onDownloadStart: PropTypes.func,
        onDownloadSuccess: PropTypes.func,
        show: PropTypes.bool
    };

    static defaultProps = {
        onCancelPress: emptyFunction,
        onDownloadStart: emptyFunction,
        onDownloadSuccess: emptyFunction,
        show: false
    };

    checkForPermissions = async () => {
        const canWriteToStorage = await PermissionsAndroid.check(EXTERNAL_STORAGE_PERMISSION);
        if (!canWriteToStorage) {
            const permissionRequest = await PermissionsAndroid.request(EXTERNAL_STORAGE_PERMISSION, 'We need access to the downloads folder to save files.');
            return permissionRequest === 'granted';
        }

        return true;
    }

    handleDownload = async () => {
        const {file, onDownloadCancel, onDownloadStart, onDownloadSuccess} = this.props;

        const canWriteToStorage = await this.checkForPermissions();
        if (!canWriteToStorage) {
            onDownloadCancel();
            return;
        }

        try {
            ToastAndroid.show('Download started', ToastAndroid.SHORT);
            onDownloadStart();

            const imageUrl = Client4.getFileUrl(file.id);

            const task = RNFetchBlob.config({
                fileCache: true,
                addAndroidDownloads: {
                    useDownloadManager: true,
                    notification: true,
                    path: `${RNFetchBlob.fs.dirs.DownloadDir}/${file.name}`,
                    title: `${file.name} download successful`,
                    mime: file.mime_type,
                    description: file.name,
                    mediaScannable: true
                }
            }).fetch('GET', imageUrl, {
                Authorization: `Bearer ${Client4.token}`
            });

            await task;

            ToastAndroid.show('Download complete', ToastAndroid.SHORT);
            onDownloadSuccess();
        } catch (error) {
            ToastAndroid.show('Download failed', ToastAndroid.SHORT);
            onDownloadCancel();
        }
    }

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
        justifyContent: 'center'
    },
    downloadButtonText: {
        color: 'white',
        fontSize: 15,
        paddingLeft: 15
    },
    wrapper: {
        position: 'absolute',
        backgroundColor: '#575757',
        top: HEADER_HEIGHT,
        right: 0,
        width: 150
    }
});
