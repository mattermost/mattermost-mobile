// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    CameraRoll,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import RNFetchBlob from 'react-native-fetch-blob';
import {AnimatedCircularProgress} from 'react-native-circular-progress';
import Icon from 'react-native-vector-icons/Ionicons';
import Orientation from 'react-native-orientation';

import {Client4} from 'mattermost-redux/client';

import FormattedText from 'app/components/formatted_text';
import {emptyFunction} from 'app/utils/general';

const {View: AnimatedView} = Animated;

export default class Downloader extends PureComponent {
    static propTypes = {
        file: PropTypes.object.isRequired,
        onDownloadCancel: PropTypes.func,
        onDownloadSuccess: PropTypes.func,
        show: PropTypes.bool
    };

    static defaultProps = {
        onCancelPress: emptyFunction,
        onDownloadSuccess: emptyFunction,
        show: false
    };

    constructor(props) {
        super(props);

        const {height: deviceHeight} = Dimensions.get('window');
        this.state = {
            deviceHeight,
            downloaderTop: new Animated.Value(deviceHeight),
            progress: 0
        };
    }

    componentWillMount() {
        Orientation.addOrientationListener(this.orientationDidChange);
    }

    componentWillUnmount() {
        Orientation.removeOrientationListener(this.orientationDidChange);
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.show && nextProps.show) {
            this.toggleDownloader();
            this.setState({
                didCancel: false,
                progress: 0
            });
        } else if (!nextProps.show && this.props.show) {
            this.toggleDownloader(false);
        }
    }

    orientationDidChange = () => {
        const {height: deviceHeight} = Dimensions.get('window');
        const top = this.props.show ? (deviceHeight / 2) - 100 : deviceHeight;

        setTimeout(() => {
            Animated.spring(this.state.downloaderTop, {
                toValue: top,
                tension: 8,
                friction: 5
            }).start();
        }, 200);
    };

    toggleDownloader = (show = true) => {
        const {deviceHeight} = this.state;
        const top = show ? (deviceHeight / 2) - 100 : deviceHeight;

        Animated.spring(this.state.downloaderTop, {
            toValue: top,
            tension: 8,
            friction: 5
        }).start(() => {
            if (show) {
                this.startDownload();
            }
        });
    };

    startDownload = async () => {
        try {
            const {file} = this.props;
            const imageUrl = Client4.getFileUrl(file.id);

            this.downloadTask = RNFetchBlob.config({
                fileCache: true,
                appendExt: file.extension
            }).fetch('GET', imageUrl).progress((received, total) => {
                const progress = (received / total) * 100;
                this.setState({
                    progress
                });
            });

            const res = await this.downloadTask;
            const path = res.path();
            const newPath = await CameraRoll.saveToCameraRoll(path, 'photo');

            this.setState({
                progress: 100
            }, () => {
                // need to wait a bit for the progress circle UI to update to the give progress
                setTimeout(async () => {
                    try {
                        // handles the case of a late cancellation by the user
                        // and ensures that we remove the file if they did cancel late.
                        if (this.state.didCancel) {
                            // TODO: There's issue with deleting files from the cameraRoll on iOS here https://github.com/wkh237/react-native-fetch-blob/issues/479
                            // This only occurs if the user cancels when the download is around 80% or more
                            await RNFetchBlob.fs.unlink(newPath);
                            this.props.onDownloadCancel();
                        } else {
                            this.props.onDownloadSuccess();
                        }
                    } catch (error) {
                        // ensure the downloader at least closes if a error
                        this.props.onDownloadCancel();
                    }
                }, 2000);
            });

            res.flush(); // remove the temp file
            this.downloadTask = null;
        } catch (error) {
            // cancellation throws so we need to catch
        }
    }

    handleCancelDownload = () => {
        this.setState({
            didCancel: true
        });

        if (this.downloadTask) {
            this.downloadTask.cancel(() => {
                this.props.onDownloadCancel();
            });
        }
    }

    renderProgress = (fill) => {
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
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={this.handleCancelDownload}
                    >
                        <FormattedText
                            id='channel_modal.cancel'
                            defaultMessage='Cancel'
                            style={styles.cancelText}
                        />
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.progressContent}>
                {component}
                <View style={styles.bottomContent}>
                    {(realFill < 100 || this.state.didCancel) ?
                        <FormattedText
                            id='mobile.downloader.downloading'
                            defaultMessage='Downloading...'
                            style={styles.bottomText}
                        /> :
                        <FormattedText
                            id='mobile.downloader.success'
                            defaultMessage='Image Saved'
                            style={styles.bottomText}
                        />
                    }
                </View>
            </View>
        );
    };

    render() {
        const {show} = this.props;
        if (!show) {
            return null;
        }

        const {didCancel, progress} = this.state;

        const trueProgress = didCancel ? 0 : progress;

        const containerHeight = show ? '100%' : 0;
        return (
            <View style={[styles.container, {height: containerHeight}]}>
                <AnimatedView style={[styles.downloader, {top: this.state.downloaderTop}]}>
                    <View style={styles.progressCircleContent}>
                        <AnimatedCircularProgress
                            size={120}
                            fill={trueProgress}
                            width={4}
                            backgroundColor='rgba(255, 255, 255, 0.5)'
                            tintColor='white'
                            rotation={0}
                            style={styles.progressCircle}
                        >
                            {this.renderProgress}
                        </AnimatedCircularProgress>
                    </View>
                </AnimatedView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    bottomContent: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    bottomText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    },
    cancelButton: {
        height: 30,
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5
    },
    cancelText: {
        color: 'white',
        fontSize: 12
    },
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
    },
    downloader: {
        alignItems: 'center',
        alignSelf: 'center',
        height: 220,
        width: 236,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
    },
    progressContainer: {
        flex: 1
    },
    progressContent: {
        position: 'absolute',
        height: '100%',
        width: '100%',
        top: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    progressCircle: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    progressCircleContent: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center'
    },
    progressCirclePercentage: {
        flex: 1,
        alignItems: 'center',
        marginTop: 80
    },
    progressText: {
        color: 'white',
        fontSize: 18
    }
});
