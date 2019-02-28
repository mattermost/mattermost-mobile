// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    NativeModules,
    NativeEventEmitter,
    Platform,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import OpenFile from 'react-native-doc-viewer';
import RNFetchBlob from 'rn-fetch-blob';
import {CircularProgress} from 'react-native-circular-progress';
import {intlShape} from 'react-intl';
import tinyColor from 'tinycolor2';

import {getFileUrl} from 'mattermost-redux/utils/file_utils.js';

import {DeviceTypes} from 'app/constants/';
import mattermostBucket from 'app/mattermost_bucket';
import {changeOpacity} from 'app/utils/theme';

import FileAttachmentIcon from './file_attachment_icon';

const {DOCUMENTS_PATH} = DeviceTypes;
const DOWNLOADING_OFFSET = 28;
const TEXT_PREVIEW_FORMATS = [
    'application/json',
    'application/x-x509-ca-cert',
    'text/plain',
];
const circularProgressWidth = 4;

export default class FileAttachmentDocument extends PureComponent {
    static propTypes = {
        backgroundColor: PropTypes.string,
        canDownloadFiles: PropTypes.bool.isRequired,
        iconHeight: PropTypes.number,
        iconWidth: PropTypes.number,
        file: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        onLongPress: PropTypes.func,
        wrapperHeight: PropTypes.number,
        wrapperWidth: PropTypes.number,
    };

    static defaultProps = {
        iconHeight: 47,
        iconWidth: 47,
        wrapperHeight: 80,
        wrapperWidth: 80,
    };

    static contextTypes = {
        intl: intlShape,
    };

    state = {
        didCancel: false,
        downloading: false,
        preview: false,
        progress: 0,
    };

    componentDidMount() {
        this.mounted = true;
        this.eventEmitter = new NativeEventEmitter(NativeModules.RNReactNativeDocViewer);
        this.eventEmitter.addListener('DoneButtonEvent', this.onDonePreviewingFile);
    }

    componentWillUnmount() {
        this.mounted = false;
        this.eventEmitter.removeListener();
    }

    cancelDownload = () => {
        if (this.mounted) {
            this.setState({didCancel: true});
        }

        if (this.downloadTask) {
            this.downloadTask.cancel();
        }
    };

    setStatusBarColor = (style) => {
        if (Platform.OS === 'ios') {
            if (style) {
                StatusBar.setBarStyle(style, true);
            } else {
                const {theme} = this.props;
                const headerColor = tinyColor(theme.sidebarHeaderBg);
                let barStyle = 'light-content';
                if (headerColor.isLight() && Platform.OS === 'ios') {
                    barStyle = 'dark-content';
                }
                StatusBar.setBarStyle(barStyle, true);
            }
        }
    };

    downloadAndPreviewFile = async (file) => {
        const {data} = file;
        const path = `${DOCUMENTS_PATH}/${data.id}-${file.caption}`;

        this.setState({didCancel: false});

        try {
            const certificate = await mattermostBucket.getPreference('cert');
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
                session: data.id,
                timeout: 10000,
                indicator: true,
                overwrite: true,
                path,
                certificate,
            };

            const mime = data.mime_type.split(';')[0];
            let openDocument = this.openDocument;
            if (TEXT_PREVIEW_FORMATS.includes(mime)) {
                openDocument = this.previewTextFile;
            }

            const exist = await RNFetchBlob.fs.exists(path);
            if (exist) {
                openDocument(file, 0);
            } else {
                this.setState({downloading: true});
                this.downloadTask = RNFetchBlob.config(options).fetch('GET', getFileUrl(data.id));
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
        const {canDownloadFiles, file} = this.props;
        const {downloading, progress} = this.state;

        if (!canDownloadFiles) {
            this.showDownloadDisabledAlert();
            return;
        }

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
        const {data} = file;
        const prefix = Platform.OS === 'android' ? 'file:/' : '';
        const path = `${DOCUMENTS_PATH}/${data.id}-${file.caption}`;
        const readFile = RNFetchBlob.fs.readFile(`${prefix}${path}`, 'utf8');
        setTimeout(async () => {
            try {
                const content = await readFile;
                navigator.push({
                    screen: 'TextPreview',
                    title: file.caption,
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

    onDonePreviewingFile = () => {
        this.setState({preview: false});
        this.setStatusBarColor();
    };

    openDocument = (file, delay = 2000) => {
        // The animation for the progress circle takes about 2 seconds to finish
        // therefore we are delaying the opening of the document to have the UI
        // shown nicely and smooth
        setTimeout(() => {
            if (!this.state.didCancel && !this.state.preview && this.mounted) {
                const {data} = file;
                const prefix = Platform.OS === 'android' ? 'file:/' : '';
                const path = `${DOCUMENTS_PATH}/${data.id}-${file.caption}`;
                this.setState({preview: true});
                this.setStatusBarColor('dark-content');
                OpenFile.openDoc([{
                    url: `${prefix}${path}`,
                    fileNameOptional: file.caption,
                    fileName: encodeURI(data.name.split('.').slice(0, -1).join('.')),
                    fileType: data.extension,
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
                                fileType: data.extension.toUpperCase(),
                            }),
                            [{
                                text: intl.formatMessage({
                                    id: 'mobile.server_upgrade.button',
                                    defaultMessage: 'OK',
                                }),
                            }]
                        );
                        this.onDonePreviewingFile();
                        RNFetchBlob.fs.unlink(path);
                    }

                    this.setState({downloading: false, progress: 0});
                });

                // Android does not trigger the event for DoneButtonEvent
                // so we'll wait 4 seconds before enabling the tap for open the preview again
                if (Platform.OS === 'android') {
                    setTimeout(this.onDonePreviewingFile, 4000);
                }
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
        const {wrapperWidth} = this.props;

        return (
            <View style={[style.circularProgressContent, {width: wrapperWidth}]}>
                {this.renderFileAttachmentIcon()}
            </View>
        );
    };

    showDownloadDisabledAlert = () => {
        const {intl} = this.context;

        Alert.alert(
            intl.formatMessage({
                id: 'mobile.downloader.disabled_title',
                defaultMessage: 'Download disabled',
            }),
            intl.formatMessage({
                id: 'mobile.downloader.disabled_description',
                defaultMessage: 'File downloads are disabled on this server. Please contact your System Admin for more details.\n',
            }),
            [{
                text: intl.formatMessage({
                    id: 'mobile.server_upgrade.button',
                    defaultMessage: 'OK',
                }),
            }]
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

    renderFileAttachmentIcon = () => {
        const {backgroundColor, iconHeight, iconWidth, file, theme, wrapperHeight, wrapperWidth} = this.props;
        const {downloading} = this.state;
        let height = wrapperHeight;
        let width = wrapperWidth;

        if (downloading) {
            height -= DOWNLOADING_OFFSET;
            width -= DOWNLOADING_OFFSET;
        }

        return (
            <FileAttachmentIcon
                backgroundColor={backgroundColor}
                file={file.data}
                theme={theme}
                iconHeight={iconHeight}
                iconWidth={iconWidth}
                wrapperHeight={height}
                wrapperWidth={width}
            />
        );
    }

    render() {
        const {onLongPress, theme, wrapperHeight} = this.props;
        const {downloading, progress} = this.state;

        let fileAttachmentComponent;
        if (downloading) {
            fileAttachmentComponent = (
                <CircularProgress
                    size={wrapperHeight}
                    fill={progress}
                    width={circularProgressWidth}
                    backgroundColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    tintColor={theme.linkColor}
                    rotation={0}
                >
                    {this.renderProgress}
                </CircularProgress>
            );
        } else {
            fileAttachmentComponent = this.renderFileAttachmentIcon();
        }

        return (
            <TouchableOpacity
                onPress={this.handlePreviewPress}
                onLongPress={onLongPress}
            >
                {fileAttachmentComponent}
            </TouchableOpacity>
        );
    }
}

const style = StyleSheet.create({
    circularProgressContent: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        left: -circularProgressWidth,
        position: 'absolute',
        top: 0,
    },
});
