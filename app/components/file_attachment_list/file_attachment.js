// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Platform,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import OpenFile from 'react-native-doc-viewer';
import RNFetchBlob from 'react-native-fetch-blob';
import {AnimatedCircularProgress} from 'react-native-circular-progress';
import {intlShape} from 'react-intl';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import * as Utils from 'mattermost-redux/utils/file_utils.js';

import {DeviceTypes} from 'app/constants/';

import FileAttachmentIcon from './file_attachment_icon';
import FileAttachmentImage from './file_attachment_image';

const {DOCUMENTS_PATH} = DeviceTypes;
const SUPPORTED_DOCS_FORMAT = [
    'application/pdf',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/xml',
    'text/csv'
];

export default class FileAttachment extends PureComponent {
    static propTypes = {
        addFileToFetchCache: PropTypes.func.isRequired,
        fetchCache: PropTypes.object.isRequired,
        file: PropTypes.object.isRequired,
        onInfoPress: PropTypes.func,
        onPreviewPress: PropTypes.func,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        onInfoPress: () => true,
        onPreviewPress: () => true
    };

    static contextTypes = {
        intl: intlShape
    };

    state = {
        didCancel: false,
        downloading: false,
        progress: 0
    };

    cancelDownload = () => {
        this.setState({didCancel: true});
        if (this.downloadTask) {
            this.downloadTask.cancel();
        }
    };

    downloadAndPreviewFile = async (file) => {
        const path = `${DOCUMENTS_PATH}/${file.name}`;

        try {
            const isDir = await RNFetchBlob.fs.isDir(DOCUMENTS_PATH);
            if (!isDir) {
                try {
                    await RNFetchBlob.fs.mkdir(DOCUMENTS_PATH);
                } catch (error) {
                    // Do nothing
                }
            }

            const options = {
                session: file.id,
                timeout: 10000,
                indicator: true,
                overwrite: true,
                path
            };

            const exist = await RNFetchBlob.fs.exists(path);
            if (exist) {
                this.openDocument(file, 0);
            } else {
                this.setState({downloading: true});
                this.downloadTask = RNFetchBlob.config(options).fetch('GET', Utils.getFileUrl(file.id)).
                    progress((received, total) => {
                        const progress = (received / total) * 100;
                        this.setState({progress});
                    });

                await this.downloadTask;
                this.setState({
                    progress: 100
                }, () => {
                    // need to wait a bit for the progress circle UI to update to the give progress
                    this.openDocument(file);
                });
            }
        } catch (error) {
            RNFetchBlob.fs.unlink(path);
            this.setState({downloading: false, progress: 0});

            if (error.message !== 'cancelled') {
                const {intl} = this.context;
                Alert.alert(
                    intl.formatMessage({
                        id: 'mobile.downloader.failed_title',
                        defaultMessage: 'Download failed'
                    }),
                    intl.formatMessage({
                        id: 'mobile.downloader.failed_description',
                        defaultMessage: 'An error occurred while downloading the file. Please check your internet connection and try again.\n'
                    }),
                    [{
                        text: intl.formatMessage({
                            id: 'mobile.server_upgrade.button',
                            defaultMessage: 'OK'
                        })
                    }]
                );
            }
        }
    };

    openDocument = (file, delay = 2000) => {
        setTimeout(() => {
            if (!this.state.didCancel) {
                const prefix = Platform.OS === 'android' ? 'file:/' : '';
                const path = `${DOCUMENTS_PATH}/${file.name}`;
                OpenFile.openDoc([{
                    url: `${prefix}${path}`,
                    fileName: file.name,
                    fileType: file.extension
                }], (error) => {
                    if (error) {
                        const {intl} = this.context;
                        Alert.alert(
                            intl.formatMessage({
                                id: 'mobile.document_preview.failed_title',
                                defaultMessage: 'Open Document failed'
                            }),
                            intl.formatMessage({
                                id: 'mobile.document_preview.failed_description',
                                defaultMessage: 'An error occurred while opening the document. Please make sure you have a {fileType} viewer installed and try again.\n'
                            }, {
                                fileType: file.extension.toUpperCase()
                            }),
                            [{
                                text: intl.formatMessage({
                                    id: 'mobile.server_upgrade.button',
                                    defaultMessage: 'OK'
                                })
                            }]
                        );
                        RNFetchBlob.fs.unlink(path);
                    }
                    this.setState({downloading: false, progress: 0});
                });
            }
        }, delay);
    };

    renderFileInfo() {
        const {file, theme} = this.props;
        const style = getStyleSheet(theme);

        if (!file.id) {
            return null;
        }

        return (
            <View>
                <Text
                    numberOfLines={4}
                    style={style.fileName}
                >
                    {file.name.trim()}
                </Text>
                <View style={style.fileDownloadContainer}>
                    <Text style={style.fileInfo}>
                        {`${file.extension.toUpperCase()} ${Utils.getFormattedFileSize(file)}`}
                    </Text>
                </View>
            </View>
        );
    }

    handleInfoPress = () => {
        if (!this.state.downloading) {
            this.props.onInfoPress();
        }
    };

    handlePreviewPress = async () => {
        const {file} = this.props;
        const {downloading} = this.state;
        let mime = file.mime_type;
        if (mime.includes(';')) {
            mime = mime.split(';')[0];
        }

        if (downloading) {
            this.cancelDownload();
        } else if (file && SUPPORTED_DOCS_FORMAT.includes(mime)) {
            this.downloadAndPreviewFile(file);
        } else {
            this.props.onPreviewPress(this.props.file);
        }
    };

    renderProgress = () => {
        const {file, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.circularProgressContent}>
                <FileAttachmentIcon
                    file={file}
                    theme={theme}
                    wrapperHeight={65}
                    wrapperWidth={65}
                />
            </View>
        );
    };

    render() {
        const {file, theme} = this.props;
        const {downloading, progress} = this.state;
        const style = getStyleSheet(theme);

        let fileAttachmentComponent;
        if (file.has_preview_image || file.loading || file.mime_type === 'image/gif') {
            fileAttachmentComponent = (
                <FileAttachmentImage
                    addFileToFetchCache={this.props.addFileToFetchCache}
                    fetchCache={this.props.fetchCache}
                    file={file}
                    theme={theme}
                />
            );
        } else if (downloading) {
            fileAttachmentComponent = (
                <AnimatedCircularProgress
                    size={100}
                    fill={progress}
                    width={4}
                    backgroundColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    tintColor={theme.linkColor}
                    rotation={0}
                    style={style.circularProgress}
                >
                    {this.renderProgress}
                </AnimatedCircularProgress>
            );
        } else {
            fileAttachmentComponent = (
                <FileAttachmentIcon
                    file={file}
                    theme={theme}
                />
            );
        }

        return (
            <View style={style.fileWrapper}>
                <TouchableOpacity onPress={this.handlePreviewPress}>
                    {fileAttachmentComponent}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={this.handleInfoPress}
                    style={style.fileInfoContainer}
                >
                    {this.renderFileInfo()}
                </TouchableOpacity>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        downloadIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            marginRight: 5
        },
        fileDownloadContainer: {
            flexDirection: 'row',
            marginTop: 3
        },
        fileInfo: {
            marginLeft: 2,
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.5)
        },
        fileInfoContainer: {
            flex: 1,
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2)
        },
        fileName: {
            flexDirection: 'column',
            flexWrap: 'wrap',
            marginLeft: 2,
            fontSize: 14,
            color: theme.centerChannelColor
        },
        fileWrapper: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 10,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2)
        },
        circularProgress: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center'
        },
        circularProgressContent: {
            position: 'absolute',
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center'
        }
    };
});
