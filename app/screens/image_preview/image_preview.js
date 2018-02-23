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
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import RNFetchBlob from 'react-native-fetch-blob';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {intlShape} from 'react-intl';
import Permissions from 'react-native-permissions';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {DeviceTypes} from 'app/constants/';
import FileAttachmentDocument, {SUPPORTED_DOCS_FORMAT} from 'app/components/file_attachment_list/file_attachment_document';
import FileAttachmentIcon from 'app/components/file_attachment_list/file_attachment_icon';
import SafeAreaView from 'app/components/safe_area_view';
import Swiper from 'app/components/swiper';
import {NavigationTypes, PermissionTypes} from 'app/constants';
import {emptyFunction} from 'app/utils/general';

import Downloader from './downloader';
import Previewer from './previewer';
import VideoPreview from './video_preview';

const {VIDEOS_PATH} = DeviceTypes;
const {View: AnimatedView} = Animated;
const DRAG_VERTICAL_THRESHOLD_START = 25; // When do we want to start capturing the drag
const DRAG_VERTICAL_THRESHOLD_END = 100; // When do we want to navigate back
const DRAG_HORIZONTAL_THRESHOLD = 50; // Make sure that it's not a sloppy horizontal swipe
const HEADER_HEIGHT = 64;
const STATUSBAR_HEIGHT = Platform.select({
    ios: 0,
    android: 20,
});
const SUPPORTED_VIDEO_FORMAT = Platform.select({
    ios: ['video/mp4', 'video/x-m4v', 'video/quicktime'],
    android: ['video/3gpp', 'video/x-matroska', 'video/mp4', 'video/webm'],
});

export default class ImagePreview extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addFileToFetchCache: PropTypes.func.isRequired,
        }),
        canDownloadFiles: PropTypes.bool.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        fetchCache: PropTypes.object.isRequired,
        fileId: PropTypes.string.isRequired,
        files: PropTypes.array.isRequired,
        navigator: PropTypes.object,
        statusBarHeight: PropTypes.number,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.zoomableImages = {};

        const currentFile = props.files.findIndex((file) => file.id === props.fileId);
        this.initialPage = currentFile;

        this.state = {
            currentFile,
            drag: new Animated.ValueXY(),
            files: props.files,
            footerOpacity: new Animated.Value(1),
            pagingEnabled: true,
            showFileInfo: true,
            wrapperViewOpacity: new Animated.Value(0),
            limitOpacity: new Animated.Value(0),
        };
    }

    componentWillMount() {
        this.mainViewPanResponder = PanResponder.create({
            onMoveShouldSetPanResponderCapture: this.mainViewMoveShouldSetPanResponderCapture,
            onPanResponderMove: Animated.event([null, {
                dx: 0,
                dy: this.state.drag.y,
            }]),
            onPanResponderRelease: this.mainViewPanResponderRelease,
            onPanResponderTerminate: this.mainViewPanResponderRelease,
        });
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            Animated.timing(this.state.wrapperViewOpacity, {
                toValue: 1,
                duration: 100,
            }).start();
        });
    }

    componentWillReceiveProps(nextProps) {
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

    getPreviews = () => {
        return this.state.files.map((file, index) => {
            let mime = file.mime_type;
            if (mime && mime.includes(';')) {
                mime = mime.split(';')[0];
            }

            let component;

            if (file.has_preview_image || file.mime_type === 'image/gif') {
                component = this.renderPreviewer(file, index);
            } else if (SUPPORTED_DOCS_FORMAT.includes(mime)) {
                component = this.renderAttachmentDocument(file);
            } else if (SUPPORTED_VIDEO_FORMAT.includes(file.mime_type)) {
                component = this.renderVideoPreview(file);
            } else {
                component = this.renderAttachmentIcon(file);
            }

            return (
                <AnimatedView
                    key={file.id}
                    style={[style.pageWrapper, {height: this.props.deviceHeight, width: this.props.deviceWidth, opacity: index === this.state.currentFile ? 1 : this.state.limitOpacity}]}
                >
                    {component}
                </AnimatedView>
            );
        });
    };

    handleClose = () => {
        if (this.state.showFileInfo) {
            this.close();
        }
    };

    hideDownloader = (hideFileInfo = true) => {
        this.setState({showDownloader: false});
        if (hideFileInfo) {
            this.setHeaderAndFileInfoVisible(true);
        }
    };

    handleLayout = () => {
        if (this.refs.swiper) {
            this.refs.swiper.runOnLayout = true;
        }
    };

    handleImageDoubleTap = (x, y) => {
        this.zoomableImages[this.state.currentFile].toggleZoom(x, y);
    };

    handleImageTap = () => {
        this.hideDownloader(false);
        this.setHeaderAndFileInfoVisible(!this.state.showFileInfo);
    };

    handleIndexChanged = (currentFile) => {
        if (Number.isInteger(currentFile)) {
            this.setState({currentFile, limitOpacity: new Animated.Value(0)});
        }
    };

    handleScroll = () => {
        Animated.timing(this.state.limitOpacity, {
            toValue: 1,
            duration: 100,
        }).start();
    };

    handleVideoSeek = (seeking) => {
        this.setState({
            isZooming: !seeking,
        });
    };

    imageIsZooming = (zooming) => {
        if (zooming !== this.state.isZooming) {
            this.setHeaderAndFileInfoVisible(!zooming);
            this.setState({
                isZooming: zooming,
            });
        }
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
                toValue: {x: 0, y: 0},
            }).start();
        }
    };

    saveVideo = () => {
        const file = this.state.files[this.state.currentFile];
        if (this.refs.downloader) {
            EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
            this.refs.downloader.saveVideo(`${VIDEOS_PATH}/${file.id}.${file.extension}`);
        }
    };

    setHeaderAndFileInfoVisible = (show) => {
        this.setState({
            showFileInfo: show,
        });

        if (Platform.OS === 'ios') {
            StatusBar.setHidden(!show, 'fade');
        }

        const opacity = show ? 1 : 0;

        Animated.timing(this.state.footerOpacity, {
            toValue: opacity,
            duration: 300,
        }).start();
    };

    showDeletedFilesAlert = () => {
        const {intl} = this.context;

        Alert.alert(
            intl.formatMessage({
                id: 'mobile.image_preview.deleted_post_title',
                defaultMessage: 'Post Deleted',
            }),
            intl.formatMessage({
                id: 'mobile.image_preview.deleted_post_message',
                defaultMessage: 'This post and its files have been deleted. The previewer will now be closed.',
            }),
            [{
                text: intl.formatMessage({
                    id: 'mobile.server_upgrade.button',
                    defaultMessage: 'OK',
                }),
                onPress: this.close,
            }]
        );
    };

    showDownloader = () => {
        EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);

        this.setState({
            showDownloader: true,
        });
    };

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

    showIOSDownloadOptions = async () => {
        const {formatMessage} = this.context.intl;
        const file = this.state.files[this.state.currentFile];
        const items = [];
        let permissionRequest;

        const hasPermissionToStorage = await Permissions.check('photo');

        switch (hasPermissionToStorage) {
        case PermissionTypes.UNDETERMINED:
            permissionRequest = await Permissions.request('photo');
            if (permissionRequest !== PermissionTypes.AUTHORIZED) {
                return;
            }
            break;
        case PermissionTypes.DENIED: {
            const canOpenSettings = await Permissions.canOpenSettings();
            let grantOption = null;
            if (canOpenSettings) {
                grantOption = {
                    text: formatMessage({id: 'mobile.android.permission_denied_retry', defaultMessage: 'Set permission'}),
                    onPress: () => Permissions.openSettings(),
                };
            }

            Alert.alert(
                formatMessage({id: 'mobile.android.photos_permission_denied_title', defaultMessage: 'Photo library access is required'}),
                formatMessage({
                    id: 'mobile.ios.photos_permission_denied_description',
                    defaultMessage: 'To save images and videos to your library, please change your permission settings.',
                }),
                [
                    grantOption,
                    {text: formatMessage({id: 'mobile.android.permission_denied_dismiss', defaultMessage: 'Dismiss'})},
                ]
            );
            return;
        }
        }

        if (SUPPORTED_VIDEO_FORMAT.includes(file.mime_type)) {
            const path = `${VIDEOS_PATH}/${file.id}.${file.extension}`;
            const exist = await RNFetchBlob.fs.exists(path);
            if (exist) {
                items.push({
                    action: this.saveVideo,
                    text: {
                        id: 'mobile.image_preview.save_video',
                        defaultMessage: 'Save Video',
                    },
                });
            } else {
                this.showVideoDownloadRequiredAlert();
            }
        } else {
            items.push({
                action: this.showDownloader,
                text: {
                    id: 'mobile.image_preview.save',
                    defaultMessage: 'Save Image',
                },
            });
        }

        const options = {
            title: file.name,
            items,
            onCancelPress: () => this.setHeaderAndFileInfoVisible(true),
        };

        if (items.length) {
            this.setHeaderAndFileInfoVisible(false);

            this.props.navigator.showModal({
                screen: 'OptionsModal',
                title: '',
                animationType: 'none',
                passProps: {
                    ...options,
                },
                navigatorStyle: {
                    navBarHidden: true,
                    statusBarHidden: false,
                    statusBarHideWithNavBar: false,
                    screenBackgroundColor: 'transparent',
                    modalPresentationStyle: 'overCurrentContext',
                },
            });
        }
    };

    showVideoDownloadRequiredAlert = () => {
        const {intl} = this.context;

        Alert.alert(
            intl.formatMessage({
                id: 'mobile.video.save_error_title',
                defaultMessage: 'Save Video Error',
            }),
            intl.formatMessage({
                id: 'mobile.video.save_error_message',
                defaultMessage: 'To save the video file you need to download it first.',
            }),
            [{
                text: intl.formatMessage({
                    id: 'mobile.server_upgrade.button',
                    defaultMessage: 'OK',
                }),
            }]
        );
    };

    renderAttachmentDocument = (file) => {
        const {theme} = this.props;

        return (
            <FileAttachmentDocument
                file={file}
                theme={theme}
                iconHeight={120}
                iconWidth={120}
                wrapperHeight={200}
                wrapperWidth={200}
            />
        );
    };

    renderAttachmentIcon = (file) => {
        return (
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
    };

    renderDownloadButton = () => {
        const {canDownloadFiles} = this.props;
        const {currentFile, files} = this.state;

        const file = files[currentFile];

        if (file) {
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
                } else if (file.has_preview_image || SUPPORTED_VIDEO_FORMAT.includes(file.mime_type)) {
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
        }

        return null;
    };

    renderPreviewer = (file, index) => {
        const maxImageHeight = this.props.deviceHeight - STATUSBAR_HEIGHT;

        return (
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
    };

    renderVideoPreview = (file) => {
        const {deviceHeight, deviceWidth, theme} = this.props;

        return (
            <VideoPreview
                file={file}
                onFullScreen={this.handleImageTap}
                onSeeking={this.handleVideoSeek}
                deviceHeight={deviceHeight}
                deviceWidth={deviceWidth}
                theme={theme}
            />
        );
    };

    renderSwiper = () => {
        return (
            <Swiper
                ref='swiper'
                initialPage={this.initialPage}
                onIndexChanged={this.handleIndexChanged}
                width={this.props.deviceWidth}
                activeDotColor={this.props.theme.sidebarBg}
                dotColor={this.props.theme.sidebarText}
                scrollEnabled={!this.state.isZooming}
                showsPagination={false}
                onScrollBegin={this.handleScroll}
            >
                {this.getPreviews()}
            </Swiper>
        );
    };

    render() {
        const {currentFile, files} = this.state;
        const file = files[currentFile];

        if (!file) {
            return null;
        }

        const fileName = file ? file.name : '';

        return (
            <SafeAreaView
                backgroundColor='#000'
                navBarBackgroundColor='#000'
                footerColor='#000'
                excludeHeader={true}
            >
                <View
                    style={[style.wrapper]}
                    onLayout={this.handleLayout}
                >
                    <AnimatedView
                        style={[this.state.drag.getLayout(), {opacity: this.state.wrapperViewOpacity, flex: 1}]}
                        {...this.mainViewPanResponder.panHandlers}
                    >
                        {this.renderSwiper()}
                        <AnimatedView style={[style.headerContainer, {width: this.props.deviceWidth, opacity: this.state.footerOpacity}]}>
                            <View style={style.header}>
                                <View style={style.headerControls}>
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
                                        {`${currentFile + 1}/${files.length}`}
                                    </Text>
                                    {this.renderDownloadButton()}
                                </View>
                            </View>
                        </AnimatedView>
                        <AnimatedView style={[style.footerContainer, {width: this.props.deviceWidth, opacity: this.state.footerOpacity}]}>
                            <LinearGradient
                                style={style.footer}
                                start={{x: 0.0, y: 0.0}}
                                end={{x: 0.0, y: 0.9}}
                                colors={['transparent', '#000000']}
                                pointerEvents='none'
                            >
                                <Text style={style.filename}>
                                    {fileName}
                                </Text>
                            </LinearGradient>
                        </AnimatedView>
                    </AnimatedView>
                    <Downloader
                        ref='downloader'
                        show={this.state.showDownloader}
                        file={file}
                        deviceHeight={this.props.deviceHeight}
                        deviceWidth={this.props.deviceWidth}
                        onDownloadCancel={this.hideDownloader}
                        onDownloadStart={this.hideDownloader}
                        onDownloadSuccess={this.hideDownloader}
                    />
                </View>
            </SafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollViewContent: {
        backgroundColor: '#000',
    },
    pageWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        height: HEADER_HEIGHT,
        zIndex: 2,
    },
    header: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        height: HEADER_HEIGHT,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
    },
    headerControls: {
        alignItems: 'center',
        justifyContent: 'space-around',
        flexDirection: 'row',
        marginTop: 18,
    },
    headerIcon: {
        height: 44,
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        marginHorizontal: 10,
        color: 'white',
        fontSize: 15,
        textAlign: 'center',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        height: 64,
        zIndex: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        justifyContent: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 5,
    },
    filename: {
        color: 'white',
        fontSize: 14,
        marginBottom: 10,
    },
});
