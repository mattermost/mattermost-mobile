// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Platform,
    StatusBar,
    StyleSheet,
    View,
} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import RNFetchBlob from 'rn-fetch-blob';
import {intlShape} from 'react-intl';
import tinyColor from 'tinycolor2';

import FileAttachmentIcon from '@components/file_attachment_list/file_attachment_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import ProgressBar from '@components/progress_bar';
import {DeviceTypes} from '@constants/';
import {getFileUrl} from '@mm-redux/utils/file_utils';
import {getLocalFilePathFromFile} from '@utils/file';
import mattermostBucket from 'app/mattermost_bucket';

const {DOCUMENTS_PATH} = DeviceTypes;

export default class FileAttachmentDocument extends PureComponent {
    static propTypes = {
        backgroundColor: PropTypes.string,
        canDownloadFiles: PropTypes.bool.isRequired,
        file: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        onLongPress: PropTypes.func,
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
        const path = getLocalFilePathFromFile(DOCUMENTS_PATH, file);

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
                session: file.id,
                timeout: 10000,
                indicator: true,
                overwrite: true,
                path,
                certificate,
            };

            const exist = await RNFetchBlob.fs.exists(path);
            if (exist) {
                this.openDocument(file);
            } else {
                this.setState({downloading: true});
                this.downloadTask = RNFetchBlob.config(options).fetch('GET', getFileUrl(file.id));
                this.downloadTask.progress((received, total) => {
                    const progress = parseFloat((received / total).toFixed(1));
                    if (this.mounted) {
                        this.setState({progress});
                    }
                });

                await this.downloadTask;
                if (this.mounted) {
                    this.setState({
                        progress: 1,
                    }, () => {
                        this.openDocument(file);
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

        if (downloading && progress < 1) {
            this.cancelDownload();
        } else if (downloading) {
            this.resetViewState();
        } else {
            this.downloadAndPreviewFile(file);
        }
    };

    onDonePreviewingFile = () => {
        if (this.mounted) {
            this.setState({progress: 0, downloading: false, preview: false});
        }
        this.setStatusBarColor();
    };

    openDocument = (file) => {
        if (!this.state.didCancel && !this.state.preview && this.mounted) {
            const path = getLocalFilePathFromFile(DOCUMENTS_PATH, file);
            this.setState({preview: true});
            this.setStatusBarColor('dark-content');
            FileViewer.open(path, {
                displayName: file.name,
                onDismiss: this.onDonePreviewingFile,
                showOpenWithDialog: true,
                showAppsSuggestions: true,
            }).then(() => {
                if (this.mounted) {
                    this.setState({downloading: false, progress: 0});
                }
            }).catch(() => {
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
                    }],
                );
                this.onDonePreviewingFile();
                RNFetchBlob.fs.unlink(path);
            });
        }
    };

    resetViewState = () => {
        if (this.mounted) {
            this.setState({
                progress: 0,
                didCancel: true,
                downloading: false,
            });
        }
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
            }],
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
            }],
        );
    };

    renderFileAttachmentIcon = () => {
        const {backgroundColor, file, theme} = this.props;

        return (
            <FileAttachmentIcon
                backgroundColor={backgroundColor}
                file={file}
                theme={theme}
            />
        );
    }

    render() {
        const {onLongPress, theme} = this.props;
        const {downloading, progress} = this.state;
        let fileAttachmentComponent;
        if (downloading) {
            fileAttachmentComponent = (
                <>
                    {this.renderFileAttachmentIcon()}
                    <View style={[StyleSheet.absoluteFill, styles.progress]}>
                        <ProgressBar
                            progress={progress || 0.1}
                            color={theme.buttonBg}
                        />
                    </View>
                </>
            );
        } else {
            fileAttachmentComponent = this.renderFileAttachmentIcon();
        }

        return (
            <TouchableWithFeedback
                onPress={this.handlePreviewPress}
                onLongPress={onLongPress}
                type={'opacity'}
            >
                {fileAttachmentComponent}
            </TouchableWithFeedback>
        );
    }
}

const styles = StyleSheet.create({
    progress: {
        justifyContent: 'flex-end',
        height: 48,
        left: 2,
        top: 5,
        width: 44,
    },
});
