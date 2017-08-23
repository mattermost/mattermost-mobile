// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import RNFetchBlob from 'react-native-fetch-blob';

import {Client4} from 'mattermost-redux/client';

import FormattedText from 'app/components/formatted_text';
import {emptyFunction} from 'app/utils/general';

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

    handleDownload = async () => {
        const {file, onDownloadCancel, onDownloadStart, onDownloadSuccess} = this.props;

        try {
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

            onDownloadSuccess();
        } catch (error) {
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
