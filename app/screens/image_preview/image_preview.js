// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Animated,
    InteractionManager,
    PanResponder,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {intlShape} from 'react-intl';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import FileAttachmentIcon from 'app/components/file_attachment_list/file_attachment_icon';
import {NavigationTypes} from 'app/constants';
import {emptyFunction} from 'app/utils/general';

import Downloader from './downloader';
import Previewer from './previewer';
import VideoPreview from './video_preview';

const {View: AnimatedView} = Animated;
const DRAG_VERTICAL_THRESHOLD_START = 25; // When do we want to start capturing the drag
const DRAG_VERTICAL_THRESHOLD_END = 100; // When do we want to navigate back
const DRAG_HORIZONTAL_THRESHOLD = 50; // Make sure that it's not a sloppy horizontal swipe
const HEADER_HEIGHT = 64;
const STATUSBAR_HEIGHT = Platform.select({
    ios: 0,
    android: 20
});

const SUPPORTED_VIDEO_FORMAT = Platform.select({
    ios: ['video/mp4', 'video/x-m4v', 'video/quicktime'],
    android: ['video/3gpp', 'video/x-matroska', 'video/mp4', 'video/webm']
});

export default class ImagePreview extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addFileToFetchCache: PropTypes.func.isRequired
        }),
        canDownloadFiles: PropTypes.bool.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        fetchCache: PropTypes.object.isRequired,
        fileId: PropTypes.string.isRequired,
        files: PropTypes.array.isRequired,
        navigator: PropTypes.object,
        statusBarHeight: PropTypes.number,
        theme: PropTypes.object.isRequired
    };

    static contextTypes = {
        intl: intlShape
    };

    constructor(props) {
        super(props);

        this.zoomableImages = {};

        const currentFile = props.files.findIndex((file) => file.id === props.fileId);

        this.state = {
            currentFile,
            drag: new Animated.ValueXY(),
            files: props.files,
            footerOpacity: new Animated.Value(1),
            pagingEnabled: true,
            showFileInfo: true,
            wrapperViewOpacity: new Animated.Value(0)
        };
    }

    componentWillMount() {
        this.mainViewPanResponder = PanResponder.create({
            onMoveShouldSetPanResponderCapture: this.mainViewMoveShouldSetPanResponderCapture,
            onPanResponderMove: Animated.event([null, {
                dx: 0,
                dy: this.state.drag.y
            }]),
            onPanResponderRelease: this.mainViewPanResponderRelease,
            onPanResponderTerminate: this.mainViewPanResponderRelease
        });
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            if (this.scrollView) {
                this.scrollView.scrollTo({x: (this.state.currentFile) * this.props.deviceWidth, animated: false});
            }

            Animated.timing(this.state.wrapperViewOpacity, {
                toValue: 1,
                duration: 100
            }).start();
        });
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.deviceWidth !== nextProps.deviceWidth) {
            InteractionManager.runAfterInteractions(() => {
                if (this.scrollView) {
                    this.scrollView.scrollTo({x: (this.state.currentFile * nextProps.deviceWidth), animated: false});
                }
            });
        }

        if (!nextProps.files.length) {
            this.showDeletedFilesAlert();
        }
    }

    componentWillUnmount() {
        if (Platform.OS === 'ios') {
            StatusBar.setHidden(false, 'fade');
        }
    }

    close = () => {
        this.props.navigator.dismissModal({animationType: 'none'});
    };

    mainViewMoveShouldSetPanResponderCapture = (evt, gestureState) => {
        if (gestureState.numberActiveTouches === 2 || this.state.isZooming) {
            return false;
        }

        const {dx, dy} = gestureState;
        const isVerticalDrag = Math.abs(dy) > DRAG_VERTICAL_THRESHOLD_START && dx < DRAG_HORIZONTAL_THRESHOLD;
        if (isVerticalDrag) {
            this.setHeaderAndFileInfoVisible(false);
            return true;
        }

        return false;
    };

    mainViewPanResponderRelease = (evt, gestureState) => {
        if (Math.abs(gestureState.dy) > DRAG_VERTICAL_THRESHOLD_END) {
            this.close();
        } else {
            this.setHeaderAndFileInfoVisible(true);
            Animated.spring(this.state.drag, {
                toValue: {x: 0, y: 0}
            }).start();
        }
    };

    handleClose = () => {
        if (this.state.showFileInfo) {
            this.close();
        }
    };

    handleImageTap = () => {
        this.hideDownloader(false);
        this.setHeaderAndFileInfoVisible(!this.state.showFileInfo);
    };

    handleImageDoubleTap = (x, y) => {
        this.zoomableImages[this.state.currentFile].toggleZoom(x, y);
    };

    setHeaderAndFileInfoVisible = (show) => {
        this.setState({
            showFileInfo: show
        });

        if (Platform.OS === 'ios') {
            StatusBar.setHidden(!show, 'fade');
        }

        const opacity = show ? 1 : 0;

        Animated.timing(this.state.footerOpacity, {
            toValue: opacity,
            duration: 300
        }).start();
    };

    handleScroll = (event) => {
        const offset = event.nativeEvent.contentOffset.x / this.props.deviceWidth;
        const wholeNumber = Number((offset).toFixed(0));
        if (Math.abs(offset - wholeNumber) < 0.01) {
            this.setState({
                currentFile: wholeNumber,
                pagingEnabled: true,
                shouldShrinkImages: false
            });
        } else if (!this.state.shouldShrinkImages && !this.state.isZooming) {
            this.setState({
                shouldShrinkImages: true
            });
        }
    };

    handleScrollStopped = () => {
        EventEmitter.emit('stop-video-playback');
    };

    handleVideoSeek = (seeking) => {
        this.setState({
            isZooming: !seeking
        });
    };

    attachScrollView = (c) => {
        this.scrollView = c;
    };

    imageIsZooming = (zooming) => {
        if (zooming !== this.state.isZooming) {
            this.setHeaderAndFileInfoVisible(!zooming);
            this.setState({
                isZooming: zooming
            });
        }
    };

    showDeletedFilesAlert = () => {
        const {intl} = this.context;

        Alert.alert(
            intl.formatMessage({
                id: 'mobile.image_preview.deleted_post_title',
                defaultMessage: 'Post Deleted'
            }),
            intl.formatMessage({
                id: 'mobile.image_preview.deleted_post_message',
                defaultMessage: 'This post and its files have been deleted. The previewer will now be closed.'
            }),
            [{
                text: intl.formatMessage({
                    id: 'mobile.server_upgrade.button',
                    defaultMessage: 'OK'
                }),
                onPress: this.close
            }]
        );
    }

    showDownloadOptions = () => {
        if (Platform.OS === 'android') {
            if (this.state.showDownloader) {
                this.hideDownloader();
            } else {
                this.showDownloader();
            }
        } else {
            this.showIOSDownloadOptions();
        }
    };

    showIOSDownloadOptions = () => {
        this.setHeaderAndFileInfoVisible(false);

        const options = {
            title: this.state.files[this.state.currentFile].name,
            items: [{
                action: this.showDownloader,
                text: {
                    id: 'mobile.image_preview.save',
                    defaultMessage: 'Save Image'
                }
            }],
            onCancelPress: () => this.setHeaderAndFileInfoVisible(true)
        };

        this.props.navigator.showModal({
            screen: 'OptionsModal',
            title: '',
            animationType: 'none',
            passProps: {
                ...options
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext'
            }
        });
    };

    showDownloader = () => {
        EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);

        this.setState({
            showDownloader: true
        });
    };

    hideDownloader = (hideFileInfo = true) => {
        this.setState({showDownloader: false});
        if (hideFileInfo) {
            this.setHeaderAndFileInfoVisible(true);
        }
    };

    renderDownloadButton = () => {
        const {canDownloadFiles} = this.props;
        const {files} = this.state;

        const file = files[this.state.currentFile];

        let icon;
        let action = emptyFunction;
        if (canDownloadFiles) {
            if (Platform.OS === 'android') {
                action = this.showDownloadOptions;
                icon = (
                    <Icon
                        name='md-more'
                        size={32}
                        color='#fff'
                    />
                );
            } else if (file.has_preview_image) {
                action = this.showDownloadOptions;
                icon = (
                    <Icon
                        name='ios-download-outline'
                        size={26}
                        color='#fff'
                    />
                );
            }
        }

        return (
            <TouchableOpacity
                onPress={action}
                style={style.headerIcon}
            >
                {icon}
            </TouchableOpacity>
        );
    };

    render() {
        const maxImageHeight = this.props.deviceHeight - STATUSBAR_HEIGHT;

        const marginStyle = {
            ...Platform.select({
                ios: {
                    marginTop: this.props.statusBarHeight
                },
                android: {
                    marginTop: 10
                }
            })
        };

        return (
            <View style={[style.wrapper, {height: this.props.deviceHeight, width: this.props.deviceWidth}]}>
                <AnimatedView
                    style={[this.state.drag.getLayout(), {opacity: this.state.wrapperViewOpacity}]}
                    {...this.mainViewPanResponder.panHandlers}
                >
                    <ScrollView
                        ref={this.attachScrollView}
                        style={[style.ScrollView]}
                        contentContainerStyle={style.scrollViewContent}
                        scrollEnabled={!this.state.isZooming}
                        horizontal={true}
                        pagingEnabled={!this.state.isZooming}
                        bounces={false}
                        onScroll={this.handleScroll}
                        onMomentumScrollEnd={this.handleScrollStopped}
                        scrollEventThrottle={2}
                    >
                        {this.state.files.map((file, index) => {
                            let component;
                            if (file.has_preview_image || file.mime_type === 'image/gif') {
                                component = (
                                    <Previewer
                                        ref={(c) => {
                                            this.zoomableImages[index] = c;
                                        }}
                                        addFileToFetchCache={this.props.actions.addFileToFetchCache}
                                        fetchCache={this.props.fetchCache}
                                        file={file}
                                        theme={this.props.theme}
                                        imageHeight={Math.min(maxImageHeight, file.height)}
                                        imageWidth={Math.min(this.props.deviceWidth, file.width)}
                                        shrink={this.state.shouldShrinkImages}
                                        wrapperHeight={this.props.deviceHeight}
                                        wrapperWidth={this.props.deviceWidth}
                                        onImageTap={this.handleImageTap}
                                        onImageDoubleTap={this.handleImageDoubleTap}
                                        onZoom={this.imageIsZooming}
                                    />
                                );
                            } else if (SUPPORTED_VIDEO_FORMAT.includes(file.mime_type)) {
                                component = (
                                    <VideoPreview
                                        file={file}
                                        onFullScreen={this.handleImageTap}
                                        onSeeking={this.handleVideoSeek}
                                        deviceHeight={this.props.deviceHeight}
                                        deviceWidth={this.props.deviceWidth}
                                        theme={this.props.theme}
                                    />
                                );
                            } else {
                                component = (
                                    <TouchableOpacity
                                        activeOpacity={1}
                                        onPress={this.handleImageTap}
                                    >
                                        <FileAttachmentIcon
                                            file={file}
                                            theme={this.props.theme}
                                            iconHeight={120}
                                            iconWidth={120}
                                            wrapperHeight={200}
                                            wrapperWidth={200}
                                        />
                                    </TouchableOpacity>
                                );
                            }

                            return (
                                <View
                                    key={file.id}
                                    style={[style.pageWrapper, {height: this.props.deviceHeight, width: this.props.deviceWidth}]}
                                >
                                    {component}
                                </View>
                            );
                        })}
                    </ScrollView>
                    <AnimatedView
                        style={[style.footerHeaderWrapper, {height: this.props.deviceHeight, width: this.props.deviceWidth, opacity: this.state.footerOpacity}]}
                        pointerEvents='box-none'
                    >
                        <View style={style.header}>
                            <View style={[style.headerControls, marginStyle]}>
                                <TouchableOpacity
                                    onPress={this.handleClose}
                                    style={style.headerIcon}
                                >
                                    <Icon
                                        name='md-close'
                                        size={26}
                                        color='#fff'
                                    />
                                </TouchableOpacity>
                                <Text style={style.title}>
                                    {`${this.state.currentFile + 1}/${this.state.files.length}`}
                                </Text>
                                {this.renderDownloadButton()}
                            </View>
                        </View>
                        <LinearGradient
                            style={style.footer}
                            start={{x: 0.0, y: 0.0}}
                            end={{x: 0.0, y: 0.9}}
                            colors={['transparent', '#000000']}
                            pointerEvents='none'
                        >
                            <Text style={style.filename}>
                                {this.state.files[this.state.currentFile].name}
                            </Text>
                        </LinearGradient>
                    </AnimatedView>
                </AnimatedView>
                <Downloader
                    show={this.state.showDownloader}
                    file={this.state.files[this.state.currentFile]}
                    deviceHeight={this.props.deviceHeight}
                    deviceWidth={this.props.deviceWidth}
                    onDownloadCancel={this.hideDownloader}
                    onDownloadStart={this.hideDownloader}
                    onDownloadSuccess={this.hideDownloader}
                />
            </View>
        );
    }
}

const style = StyleSheet.create({
    filename: {
        color: 'white',
        fontSize: 15
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        justifyContent: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 16,
        ...Platform.select({
            android: {
                marginBottom: 13
            },
            ios: {
                marginBottom: 0
            }
        })
    },
    footerHeaderWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0
    },
    header: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        height: HEADER_HEIGHT,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
    },
    headerControls: {
        alignItems: 'center',
        justifyContent: 'space-around',
        flexDirection: 'row',
        ...Platform.select({
            android: {
                marginTop: 0
            },
            ios: {
                marginTop: 5
            }
        })
    },
    headerIcon: {
        height: 44,
        width: 48,
        alignItems: 'center',
        justifyContent: 'center'
    },
    pageWrapper: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#000'
    },
    scrollViewContent: {
        backgroundColor: '#000'
    },
    title: {
        flex: 1,
        marginHorizontal: 10,
        color: 'white',
        fontSize: 15,
        textAlign: 'center'
    },
    wrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
    }
});
