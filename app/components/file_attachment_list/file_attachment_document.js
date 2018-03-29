// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import OpenFile from 'react-native-doc-viewer';
import RNFetchBlob from 'react-native-fetch-blob';
import {CircularProgress} from 'react-native-circular-progress';
import {intlShape} from 'react-intl';

import {changeOpacity} from 'app/utils/theme';
import {getFileUrl} from 'mattermost-redux/utils/file_utils.js';

import {DeviceTypes} from 'app/constants/';

import FileAttachmentIcon from './file_attachment_icon';

const {DOCUMENTS_PATH} = DeviceTypes;
export const SUPPORTED_DOCS_FORMAT = [
    'application/pdf',
    'application/msword',
    'application/rtf',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/xml',
    'text/csv',
    'text/plain',
];

export default class FileAttachmentDocument extends PureComponent {
    static propTypes = {
        iconHeight: PropTypes.number,
        iconWidth: PropTypes.number,
        file: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number,
    };

    static defaultProps = {
        iconHeight: 50,
        iconWidth: 50,
        wrapperHeight: 80,
        wrapperWidth: 80,
    };

    static contextTypes = {
        intl: intlShape,
    };

    state = {
        didCancel: false,
        downloading: false,
        progress: 0,
    };

    componentDidMount() {
        this.mounted = true;
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    cancelDownload = () => {
        if (this.mounted) {
            this.setState({didCancel: true});
        }

        if (this.downloadTask) {
            this.downloadTask.cancel();
        }
    };

    downloadAndPreviewFile = async (file) => {
        const path = `${DOCUMENTS_PATH}/${file.name}`;

        this.setState({didCancel: false});

        try {
            const isDir = await RNFetchBlob.fs.isDir(DOCUMENTS_PATH);
            if (!isDir) {
                try {
                    await RNFetchBlob.fs.mkdir(DOCUMENTS_PATH);
                } catch (error) {
                    this.showDownloadFailedAlert();
                    return;
                }
            }

            const options = {
                session: file.id,
                timeout: 10000,
                indicator: true,
                overwrite: true,
                path,
            };

            const mime = file.mime_type.split(';')[0];
            let openDocument = this.openDocument;
            if (mime === 'text/plain') {
                openDocument = this.previewTextFile;
            }

            const exist = await RNFetchBlob.fs.exists(path);
            if (exist) {
                openDocument(file, 0);
            } else {
                this.setState({downloading: true});
                this.downloadTask = RNFetchBlob.config(options).fetch('GET', getFileUrl(file.id));
                this.downloadTask.progress((received, total) => {
                    const progress = (received / total) * 100;
                    if (this.mounted) {
                        this.setState({progress});
                    }
                });

                await this.downloadTask;
                if (this.mounted) {
                    this.setState({
                        progress: 100,
                    }, () => {
                        // need to wait a bit for the progress circle UI to update to the give progress
                        openDocument(file);
                    });
                }
            }
        } catch (error) {
            RNFetchBlob.fs.unlink(path);
            if (this.mounted) {
                this.setState({downloading: false, progress: 0});

                if (error.message !== 'cancelled') {
                    this.showDownloadFailedAlert();
                }
            }
        }
    };

    handlePreviewPress = async () => {
        const {file} = this.props;
        const {downloading, progress} = this.state;

        if (downloading && progress < 100) {
            this.cancelDownload();
        } else if (downloading) {
            this.resetViewState();
        } else {
            this.downloadAndPreviewFile(file);
        }
    };

    previewTextFile = (file, delay = 2000) => {
        const {navigator, theme} = this.props;
        const prefix = Platform.OS === 'android' ? 'file:/' : '';
        const path = `${DOCUMENTS_PATH}/${file.name}`;
        const readFile = RNFetchBlob.fs.readFile(`${prefix}${path}`, 'utf8');
        setTimeout(async () => {
            try {
                const content = await readFile;
                navigator.push({
                    screen: 'TextPreview',
                    title: file.name,
                    animated: true,
                    backButtonTitle: '',
                    passProps: {
                        content,
                    },
                    navigatorStyle: {
                        navBarTextColor: theme.sidebarHeaderTextColor,
                        navBarBackgroundColor: theme.sidebarHeaderBg,
                        navBarButtonColor: theme.sidebarHeaderTextColor,
                        screenBackgroundColor: theme.centerChannelBg,
                    },
                });
                this.setState({downloading: false, progress: 0});
            } catch (error) {
                RNFetchBlob.fs.unlink(path);
            }
        }, delay);
    };

    openDocument = (file, delay = 2000) => {
        // The animation for the progress circle takes about 2 seconds to finish
        // therefore we are delaying the opening of the document to have the UI
        // shown nicely and smooth
        setTimeout(() => {
            if (!this.state.didCancel && this.mounted) {
                const prefix = Platform.OS === 'android' ? 'file:/' : '';
                const path = `${DOCUMENTS_PATH}/${file.name}`;
                OpenFile.openDoc([{
                    url: `${prefix}${path}`,
                    fileName: file.name,
                    fileType: file.extension,
                    cache: false,
                }], (error) => {
                    if (error) {
                        const {intl} = this.context;
                        Alert.alert(
                            intl.formatMessage({
                                id: 'mobile.document_preview.failed_title',
                                defaultMessage: 'Open Document failed',
                            }),
                            intl.formatMessage({
                                id: 'mobile.document_preview.failed_description',
                                defaultMessage: 'An error occurred while opening the document. Please make sure you have a {fileType} viewer installed and try again.\n',
                            }, {
                                fileType: file.extension.toUpperCase(),
                            }),
                            [{
                                text: intl.formatMessage({
                                    id: 'mobile.server_upgrade.button',
                                    defaultMessage: 'OK',
                                }),
                            }]
                        );
                        RNFetchBlob.fs.unlink(path);
                    }
                    this.setState({downloading: false, progress: 0});
                });
            }
        }, delay);
    };

    resetViewState = () => {
        if (this.mounted) {
            this.setState({
                progress: 0,
                didCancel: true,
            }, () => {
                // need to wait a bit for the progress circle UI to update to the give progress
                setTimeout(() => this.setState({downloading: false}), 2000);
            });
        }
    };

    renderProgress = () => {
        const {iconHeight, iconWidth, file, theme, wrapperWidth} = this.props;

        return (
            <View style={[style.circularProgressContent, {width: wrapperWidth}]}>
                <FileAttachmentIcon
                    file={file}
                    iconHeight={iconHeight}
                    iconWidth={iconWidth}
                    theme={theme}
                    wrapperHeight={iconHeight}
                    wrapperWidth={iconWidth}
                />
            </View>
        );
    };

    showDownloadFailedAlert = () => {
        const {intl} = this.context;

        Alert.alert(
            intl.formatMessage({
                id: 'mobile.downloader.failed_title',
                defaultMessage: 'Download failed',
            }),
            intl.formatMessage({
                id: 'mobile.downloader.failed_description',
                defaultMessage: 'An error occurred while downloading the file. Please check your internet connection and try again.\n',
            }),
            [{
                text: intl.formatMessage({
                    id: 'mobile.server_upgrade.button',
                    defaultMessage: 'OK',
                }),
            }]
        );
    };

    render() {
        const {iconHeight, iconWidth, file, theme, wrapperHeight, wrapperWidth} = this.props;
        const {downloading, progress} = this.state;

        let fileAttachmentComponent;
        if (downloading) {
            fileAttachmentComponent = (
                <CircularProgress
                    size={wrapperHeight}
                    fill={progress}
                    width={4}
                    backgroundColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    tintColor={theme.linkColor}
                    rotation={0}
                    style={style.circularProgress}
                >
                    {this.renderProgress}
                </CircularProgress>
            );
        } else {
            fileAttachmentComponent = (
                <FileAttachmentIcon
                    file={file}
                    theme={theme}
                    iconHeight={iconHeight}
                    iconWidth={iconWidth}
                    wrapperHeight={wrapperHeight}
                    wrapperWidth={wrapperWidth}
                />
            );
        }

        return (
            <TouchableOpacity onPress={this.handlePreviewPress}>
                {fileAttachmentComponent}
            </TouchableOpacity>
        );
    }
}

const style = StyleSheet.create({
    circularProgress: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        width: '100%',
    },
    circularProgressContent: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        left: 0,
        position: 'absolute',
        top: 0,
    },
});
