// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Animated,
    Image,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {intlShape} from 'react-intl';
import RNPermissions from 'react-native-permissions';
import Gallery from 'react-native-image-gallery';
import DeviceInfo from 'react-native-device-info';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import FileAttachmentDocument from 'app/components/file_attachment_list/file_attachment_document';
import FileAttachmentIcon from 'app/components/file_attachment_list/file_attachment_icon';
import {DeviceTypes, NavigationTypes, Permissions} from 'app/constants';
import {getLocalFilePathFromFile, isDocument, isVideo} from 'app/utils/file';
import {emptyFunction} from 'app/utils/general';
import {calculateDimensions} from 'app/utils/images';
import {t} from 'app/utils/i18n';
import {
    showModalOverCurrentContext,
    dismissModal,
    mergeNavigationOptions,
} from 'app/actions/navigation';

import Downloader from './downloader';
import VideoPreview from './video_preview';

const {VIDEOS_PATH} = DeviceTypes;
const {View: AnimatedView} = Animated;
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);
const HEADER_HEIGHT = 48;
const ANIM_CONFIG = {duration: 300};

export default class ImagePreview extends PureComponent {
    static propTypes = {
        componentId: PropTypes.string.isRequired,
        canDownloadFiles: PropTypes.bool.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        files: PropTypes.array,
        getItemMeasures: PropTypes.func.isRequired,
        index: PropTypes.number.isRequired,
        origin: PropTypes.object,
        target: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        files: [],
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        const options = {
            layout: {
                backgroundColor: '#000',
            },
        };
        mergeNavigationOptions(props.componentId, options);

        this.openAnim = new Animated.Value(0);
        this.headerFooterAnim = new Animated.Value(1);
        this.documents = [];

        this.state = {
            index: props.index,
            origin: props.origin,
            showDownloader: false,
            target: props.target,
        };
    }

    componentDidMount() {
        this.startOpenAnimation();
    }

    componentWillUnmount() {
        StatusBar.setHidden(false, 'fade');
    }

    setDocumentRef = (ref) => {
        this.documents[this.state.index] = ref;
    }

    setDownloaderRef = (ref) => {
        this.downloaderRef = ref;
    }

    animateOpenAnimToValue = (toValue, onComplete) => {
        Animated.timing(this.openAnim, {
            ...ANIM_CONFIG,
            toValue,
        }).start(() => {
            this.setState({animating: false});
            if (onComplete) {
                onComplete();
            }
        });
    };

    close = () => {
        const {getItemMeasures, componentId} = this.props;
        const {index} = this.state;

        this.setState({animating: true});
        const options = {
            layout: {
                backgroundColor: 'transparent',
            },
        };
        mergeNavigationOptions(componentId, options);

        getItemMeasures(index, (origin) => {
            if (origin) {
                this.setState(origin);
            }

            this.animateOpenAnimToValue(0, () => {
                dismissModal();
            });
        });
    };

    handleChangeImage = (index) => {
        this.setState({index});
    };

    handleSwipedVertical = (evt, gestureState) => {
        if (Math.abs(gestureState.dy) > 150) {
            this.close();
        }
    };

    handleTapped = () => {
        const {showHeaderFooter} = this.state;
        this.setHeaderAndFooterVisible(!showHeaderFooter);
    };

    hideDownloader = (hideFileInfo = true) => {
        this.setState({showDownloader: false});
        if (hideFileInfo) {
            this.setHeaderAndFooterVisible(true);
        }
    };

    getCurrentFile = () => {
        const {files} = this.props;
        const {index} = this.state;
        const file = files[index];

        return file;
    };

    getFullscreenOpacity = () => {
        const {target} = this.props;

        return {
            opacity: this.openAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, target.opacity],
            }),
        };
    };

    getHeaderFooterStyle = () => {
        return {
            start: this.headerFooterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-80, 0],
            }),
            opacity: this.headerFooterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
            }),
        };
    };

    renderAttachmentDocument = (file) => {
        const {canDownloadFiles, theme} = this.props;

        return (
            <View style={[style.flex, style.center]}>
                <FileAttachmentDocument
                    ref={this.setDocumentRef}
                    backgroundColor='transparent'
                    canDownloadFiles={canDownloadFiles}
                    file={file}
                    iconHeight={200}
                    iconWidth={200}
                    theme={theme}
                    wrapperHeight={200}
                    wrapperWidth={200}
                />
            </View>
        );
    };

    renderAttachmentIcon = (file) => {
        return (
            <View style={[style.flex, style.center]}>
                <FileAttachmentIcon
                    backgroundColor='transparent'
                    file={file}
                    theme={this.props.theme}
                    iconHeight={200}
                    iconWidth={200}
                    wrapperHeight={200}
                    wrapperWidth={200}
                />
            </View>
        );
    };

    renderDownloadButton = () => {
        const {canDownloadFiles} = this.props;
        const file = this.getCurrentFile();

        if (file?.data?.localPath) {
            // we already have the file locally we don't need to download it
            return null;
        }

        if (file) {
            let icon;
            let action = emptyFunction;
            if (canDownloadFiles) {
                action = this.showDownloadOptions;
                if (Platform.OS === 'android') {
                    icon = (
                        <Icon
                            name='md-more'
                            size={32}
                            color='#fff'
                        />
                    );
                } else if (file.source || isVideo(file.data)) {
                    icon = (
                        <Icon
                            name='ios-download'
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

    renderDownloader = () => {
        const {deviceHeight, deviceWidth} = this.props;
        const file = this.getCurrentFile();

        return (
            <Downloader
                ref={this.setDownloaderRef}
                show={this.state.showDownloader}
                file={file}
                deviceHeight={deviceHeight}
                deviceWidth={deviceWidth}
                onDownloadCancel={this.hideDownloader}
                onDownloadStart={this.hideDownloader}
                onDownloadSuccess={this.hideDownloader}
            />
        );
    };

    renderFooter = () => {
        const {files} = this.props;
        const {index} = this.state;
        const footer = this.getHeaderFooterStyle();
        return (
            <Animated.View style={[{bottom: footer.start, opacity: footer.opacity}, style.footerContainer]}>
                <LinearGradient
                    style={style.footer}
                    start={{x: 0.0, y: 0.0}}
                    end={{x: 0.0, y: 0.9}}
                    colors={['transparent', '#000000']}
                    pointerEvents='none'
                >
                    <Text style={style.filename}>
                        {(files[index] && files[index].caption) || ''}
                    </Text>
                </LinearGradient>
            </Animated.View>
        );
    };

    renderGallery = () => {
        return (
            <Gallery
                errorComponent={this.renderOtherItems}
                imageComponent={this.renderImageComponent}
                images={this.props.files}
                initialPage={this.state.index}
                onPageSelected={this.handleChangeImage}
                onSingleTapConfirmed={this.handleTapped}
                onSwipedVertical={this.handleSwipedVertical}
                pageMargin={2}
                style={style.flex}
            />
        );
    };

    renderHeader = () => {
        const {files} = this.props;
        const {index} = this.state;
        const header = this.getHeaderFooterStyle();

        return (
            <AnimatedView style={[style.headerContainer, {top: header.start, opacity: header.opacity}]}>
                <View style={style.header}>
                    <View style={style.headerControls}>
                        <TouchableOpacity
                            onPress={this.close}
                            style={style.headerIcon}
                        >
                            <Icon
                                name='md-close'
                                size={26}
                                color='#fff'
                            />
                        </TouchableOpacity>
                        <Text style={style.title}>
                            {`${index + 1}/${files.length}`}
                        </Text>
                        {this.renderDownloadButton()}
                    </View>
                </View>
            </AnimatedView>
        );
    };

    renderImageComponent = (imageProps, imageDimensions) => {
        if (imageDimensions) {
            const {deviceHeight, deviceWidth} = this.props;
            const {height, width} = imageDimensions;
            const {style, source} = imageProps;
            const statusBar = DeviceTypes.IS_IPHONE_WITH_INSETS ? 0 : 20;
            const flattenStyle = StyleSheet.flatten(style);
            const calculatedDimensions = calculateDimensions(height, width, deviceWidth, deviceHeight - statusBar);
            const imageStyle = {...flattenStyle, ...calculatedDimensions};

            return (
                <View style={[style, {justifyContent: 'center', alignItems: 'center'}]}>
                    <Image
                        source={source}
                        style={imageStyle}
                    />
                </View>
            );
        }

        return null;
    };

    renderOtherItems = (index) => {
        const {files} = this.props;
        const file = files[index];

        if (file.data) {
            if (isDocument(file.data)) {
                return this.renderAttachmentDocument(file);
            } else if (isVideo(file.data)) {
                return this.renderVideoPreview(file);
            }

            return this.renderAttachmentIcon(file.data);
        }

        return <View/>;
    };

    renderVideoPreview = (file) => {
        const {deviceHeight, deviceWidth, theme} = this.props;
        const statusBar = DeviceTypes.IS_IPHONE_WITH_INSETS ? 0 : 20;

        return (
            <VideoPreview
                file={file}
                onFullScreen={this.setHeaderAndFooterVisible}
                deviceHeight={deviceHeight - statusBar}
                deviceWidth={deviceWidth}
                theme={theme}
            />
        );
    };

    saveVideoIOS = () => {
        const file = this.getCurrentFile();

        if (this.downloaderRef) {
            EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
            this.downloaderRef.saveVideo(getLocalFilePathFromFile(VIDEOS_PATH, file));
        }
    };

    setHeaderAndFooterVisible = (show) => {
        const toValue = show ? 1 : 0;

        if (!show) {
            this.hideDownloader();
        }

        this.setState({showHeaderFooter: show});
        StatusBar.setHidden(!show, 'slide');

        Animated.timing(this.headerFooterAnim, {
            ...ANIM_CONFIG,
            toValue,
        }).start();
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
            this.showDownloadOptionsIOS();
        }
    };

    showDownloadOptionsIOS = async () => {
        const {formatMessage} = this.context.intl;
        const file = this.getCurrentFile();
        const items = [];
        let permissionRequest;

        const hasPermissionToStorage = await RNPermissions.check('photo');

        switch (hasPermissionToStorage) {
        case Permissions.UNDETERMINED:
            permissionRequest = await RNPermissions.request('photo');
            if (permissionRequest !== Permissions.AUTHORIZED) {
                return;
            }
            break;
        case Permissions.DENIED: {
            const canOpenSettings = await RNPermissions.canOpenSettings();
            let grantOption = null;
            if (canOpenSettings) {
                grantOption = {
                    text: formatMessage({id: 'mobile.permission_denied_retry', defaultMessage: 'Settings'}),
                    onPress: () => RNPermissions.openSettings(),
                };
            }

            const applicationName = DeviceInfo.getApplicationName();
            Alert.alert(
                formatMessage({
                    id: 'mobile.photo_library_permission_denied_title',
                    defaultMessage: '{applicationName} would like to access your photo library',
                }, {applicationName}),
                formatMessage({
                    id: 'mobile.photo_library_permission_denied_description',
                    defaultMessage: 'To save images and videos to your library, please change your permission settings.',
                }),
                [
                    grantOption,
                    {text: formatMessage({id: 'mobile.permission_denied_dismiss', defaultMessage: 'Don\'t Allow'})},
                ]
            );
            return;
        }
        }

        if (isVideo(file.data)) {
            const path = getLocalFilePathFromFile(VIDEOS_PATH, file);
            const exist = await RNFetchBlob.fs.exists(path);
            if (exist) {
                items.push({
                    action: this.saveVideoIOS,
                    text: {
                        id: t('mobile.image_preview.save_video'),
                        defaultMessage: 'Save Video',
                    },
                });
            } else {
                this.showVideoDownloadRequiredAlertIOS();
            }
        } else {
            items.push({
                action: this.showDownloader,
                text: {
                    id: t('mobile.image_preview.save'),
                    defaultMessage: 'Save Image',
                },
            });
        }

        if (items.length) {
            this.setHeaderAndFooterVisible(false);

            const screen = 'OptionsModal';
            const passProps = {
                title: file.caption,
                items,
                onCancelPress: () => this.setHeaderAndFooterVisible(true),
            };

            showModalOverCurrentContext(screen, passProps);
        }
    };

    showVideoDownloadRequiredAlertIOS = () => {
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

    startOpenAnimation = () => {
        this.animateOpenAnimToValue(1);
    };

    render() {
        const opacity = this.getFullscreenOpacity();

        return (
            <AnimatedSafeAreaView style={[style.container, opacity]}>
                <AnimatedView style={style.container}>
                    {this.renderGallery()}
                    {this.renderHeader()}
                    {this.renderFooter()}
                </AnimatedView>
                {this.renderDownloader()}
            </AnimatedSafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    flex: {
        flex: 1,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullWidth: {
        width: '100%',
    },
    headerContainer: {
        position: 'absolute',
        height: HEADER_HEIGHT,
        width: '100%',
        overflow: 'hidden',
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
        height: 64,
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'absolute',
        width: '100%',
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
