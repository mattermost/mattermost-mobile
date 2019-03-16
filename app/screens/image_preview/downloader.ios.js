// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, Animated, CameraRoll, InteractionManager, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import {CircularProgress} from 'react-native-circular-progress';
import Icon from 'react-native-vector-icons/Ionicons';
import {intlShape} from 'react-intl';

import {Client4} from 'mattermost-redux/client';

import FormattedText from 'app/components/formatted_text';
import mattermostBucket from 'app/mattermost_bucket';
import {getLocalFilePathFromFile} from 'app/utils/file';
import {emptyFunction} from 'app/utils/general';

import DownloaderBottomContent from './downloader_bottom_content.js';

const {View: AnimatedView} = Animated;

export default class Downloader extends PureComponent {
    static propTypes = {
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        downloadPath: PropTypes.string,
        file: PropTypes.object.isRequired,
        onDownloadCancel: PropTypes.func,
        onDownloadSuccess: PropTypes.func,
        prompt: PropTypes.bool,
        show: PropTypes.bool,
        saveToCameraRoll: PropTypes.bool,
    };

    static defaultProps = {
        onCancelPress: emptyFunction,
        onDownloadCancel: emptyFunction,
        onDownloadSuccess: emptyFunction,
        prompt: false,
        show: false,
        force: false,
        saveToCameraRoll: true,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.state = {
            downloaderTop: new Animated.Value(props.deviceHeight),
            progress: 0,
            started: false,
        };
    }

    componentDidMount() {
        this.mounted = true;
        if (this.props.show) {
            InteractionManager.runAfterInteractions(() => {
                this.toggleDownloader(true);
            });
        }
    }

    componentWillUnmount() {
        this.mounted = false;
        if (this.downloadTask) {
            this.downloadTask.cancel();
        }
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.show && nextProps.show) {
            this.toggleDownloader();
            this.setState({
                didCancel: false,
                progress: 0,
            });
        } else if (!nextProps.show && this.props.show) {
            this.toggleDownloader(false);
        } else if (this.props.deviceHeight !== nextProps.deviceHeight) {
            this.recenterDownloader(nextProps);
        }
    }

    downloadDidCancel = () => {
        if (this.mounted) {
            this.setState({
                didCancel: true,
                progress: 0,
                started: false,
            });
        }
        if (this.downloadTask) {
            this.downloadTask.cancel();
        }
        this.props.onDownloadCancel();
    };

    recenterDownloader = (props) => {
        const {deviceHeight, show} = props;
        const top = show ? (deviceHeight / 2) - 100 : deviceHeight;

        Animated.sequence([
            Animated.delay(200),
            Animated.spring(this.state.downloaderTop, {
                toValue: top,
                tension: 8,
                friction: 5,
            }),
        ]).start();
    };

    renderProgress = (fill) => {
        const {isVideo} = this.state;
        const realFill = Number(fill.toFixed(0));

        let component;
        if (realFill === 100) {
            component = (
                <Icon
                    name='ios-checkmark'
                    size={64}
                    color='white'
                />
            );
        } else {
            component = (
                <View style={styles.progressCirclePercentage}>
                    <Text style={styles.progressText}>
                        {`${fill.toFixed(0)}%`}
                    </Text>
                    {!isVideo &&
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={this.downloadDidCancel}
                    >
                        <FormattedText
                            id='channel_modal.cancel'
                            defaultMessage='Cancel'
                            style={styles.cancelText}
                        />
                    </TouchableOpacity>
                    }
                </View>
            );
        }

        return (
            <View>
                {component}
            </View>

        );
    };

    renderStartDownload = () => {
        return (
            <View>
                <TouchableOpacity onPress={this.startDownload}>
                    <View style={styles.manualDownloadContainer}>
                        <Icon
                            name='md-download'
                            size={48}
                            color='white'
                        />
                        <View style={styles.downloadTextContainer}>
                            <FormattedText
                                id='file_attachment.download'
                                defaultMessage='Download'
                                style={styles.cancelText}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    saveVideo = (videoPath) => {
        const {deviceHeight} = this.props;
        const top = (deviceHeight / 2) - 100;
        this.setState({
            progress: 100,
            started: true,
            force: true,
            isVideo: true,
        });
        Animated.spring(this.state.downloaderTop, {
            toValue: top,
            tension: 8,
            friction: 5,
        }).start(async () => {
            await CameraRoll.saveToCameraRoll(videoPath, 'video');
            this.props.onDownloadSuccess();
            InteractionManager.runAfterInteractions(() => {
                this.setState({force: false, isVideo: false});
            });
        });
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
                onPress: () => this.downloadDidCancel(),
            }]
        );
    };

    startDownload = async () => {
        const {file, downloadPath, prompt, saveToCameraRoll} = this.props;
        const {data} = file;

        try {
            if (this.state.didCancel) {
                this.setState({didCancel: false});
            }

            const certificate = await mattermostBucket.getPreference('cert');
            const imageUrl = Client4.getFileUrl(data.id);
            const options = {
                session: data.id,
                timeout: 10000,
                indicator: true,
                overwrite: true,
                certificate,
            };

            if (downloadPath && prompt) {
                const isDir = await RNFetchBlob.fs.isDir(downloadPath);
                if (!isDir) {
                    try {
                        await RNFetchBlob.fs.mkdir(downloadPath);
                    } catch (error) {
                        this.showDownloadFailedAlert();
                        return;
                    }
                }

                options.path = getLocalFilePathFromFile(downloadPath, file);
            } else {
                options.fileCache = true;
                options.appendExt = data.extension;
            }

            this.downloadTask = RNFetchBlob.config(options).fetch('GET', imageUrl);
            this.downloadTask.progress((received, total) => {
                const progress = (received / total) * 100;
                if (this.mounted) {
                    this.setState({
                        progress,
                        started: true,
                    });
                }
            });

            const res = await this.downloadTask;
            let path = res.path();

            if (saveToCameraRoll) {
                path = await CameraRoll.saveToCameraRoll(path, 'photo');
            }

            if (this.mounted) {
                this.setState({
                    progress: 100,
                }, () => {
                    // need to wait a bit for the progress circle UI to update to the give progress
                    setTimeout(async () => {
                        if (this.state.didCancel) {
                            try {
                                await RNFetchBlob.fs.unlink(path);
                            } finally {
                                this.props.onDownloadCancel();
                            }
                        } else {
                            this.props.onDownloadSuccess();
                        }
                    }, 2000);
                });
            }

            if (saveToCameraRoll && res) {
                res.flush(); // remove the temp file
            }

            this.downloadTask = null;
        } catch (error) {
            // cancellation throws so we need to catch
            if (downloadPath) {
                RNFetchBlob.fs.unlink(getLocalFilePathFromFile(downloadPath, file));
            }
            if (error.message !== 'cancelled' && this.mounted) {
                this.showDownloadFailedAlert();
            } else {
                this.downloadDidCancel();
            }
        }
    };

    toggleDownloader = (show = true) => {
        const {deviceHeight, prompt} = this.props;
        const top = show ? (deviceHeight / 2) - 100 : deviceHeight;

        Animated.spring(this.state.downloaderTop, {
            toValue: top,
            tension: 8,
            friction: 5,
        }).start(() => {
            if (show && !prompt) {
                this.startDownload();
            }
        });
    };

    render() {
        const {show, downloadPath, saveToCameraRoll} = this.props;
        if (!show && !this.state.force) {
            return null;
        }

        const {progress, started, isVideo} = this.state;

        const containerHeight = show ? '100%' : 0;

        let component;
        if (downloadPath && !started) {
            component = this.renderStartDownload;
        } else {
            component = this.renderProgress;
        }
        return (
            <View style={[styles.container, {height: containerHeight}]}>
                <AnimatedView style={[styles.downloader, {top: this.state.downloaderTop}]}>
                    <View style={styles.progressCircleContent}>
                        <CircularProgress
                            size={120}
                            fill={progress}
                            width={4}
                            backgroundColor='rgba(255, 255, 255, 0.5)'
                            tintColor='white'
                            rotation={0}
                        >
                            {component}
                        </CircularProgress>
                        { !this.state.didCancel && (
                            <DownloaderBottomContent
                                saveToCameraRoll={saveToCameraRoll}
                                isVideo={isVideo}
                                progressPercent={progress}
                            />
                        )}
                    </View>
                </AnimatedView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    bottomContent: {
        alignItems: 'center',
        marginTop: 10,
    },
    bottomText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        height: 30,
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
    },
    cancelText: {
        color: 'white',
        fontSize: 12,
    },
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
    },
    downloader: {
        alignItems: 'center',
        alignSelf: 'center',
        height: 220,
        width: 236,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    progressContainer: {
        flex: 1,
    },
    progressCircle: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressCircleContent: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressCirclePercentage: {
        flex: 1,
        alignItems: 'center',
        marginTop: 40,
    },
    progressText: {
        color: 'white',
        fontSize: 18,
    },
    manualDownloadContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadTextContainer: {
        marginTop: 5,
    },
});
