// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Animated,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    findNodeHandle,
} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import Icon from 'react-native-vector-icons/Ionicons';
import {intlShape} from 'react-intl';
import Permissions from 'react-native-permissions';
import Gallery from 'react-native-image-gallery';
import DeviceInfo from 'react-native-device-info';
import FastImage from 'react-native-fast-image';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import EventEmitter from '@mm-redux/utils/event_emitter';

import FileAttachmentDocument from 'app/components/file_attachment_list/file_attachment_document';
import FileAttachmentIcon from 'app/components/file_attachment_list/file_attachment_icon';
import {DeviceTypes, NavigationTypes} from 'app/constants';
import {getLocalFilePathFromFile, isDocument, isVideo, isImage} from 'app/utils/file';
import {emptyFunction} from 'app/utils/general';
import {calculateDimensions} from 'app/utils/images';
import {t} from 'app/utils/i18n';
import BottomSheet from 'app/utils/bottom_sheet';
import {mergeNavigationOptions, popTopScreen} from 'app/actions/navigation';

import Downloader from './downloader';
import VideoPreview from './video_preview';

const {VIDEOS_PATH} = DeviceTypes;
const ANIM_CONFIG = {duration: 300, userNativeDriver: true};

export default class ImagePreview extends PureComponent {
    static propTypes = {
        componentId: PropTypes.string.isRequired,
        canDownloadFiles: PropTypes.bool.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        files: PropTypes.array,
        index: PropTypes.number.isRequired,
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

        this.headerFooterAnim = new Animated.Value(1);

        this.state = {
            index: props.index,
            showDownloader: false,
            showHeaderFooter: true,
        };

        this.headerRef = React.createRef();
    }

    componentDidMount() {
        this.cancelTopBar = setTimeout(() => {
            this.initHeader();
        }, Platform.OS === 'ios' ? 350 : 0);
    }

    componentWillUnmount() {
        StatusBar.setHidden(false, 'fade');
        if (this.cancelTopBar) {
            clearTimeout(this.cancelTopBar);
        }
    }

    initHeader = async () => {
        const {formatMessage} = this.context.intl;
        const {files} = this.props;
        const {index} = this.state;
        const closeButton = await MaterialIcon.getImageSource('close', 24, '#ffffff');
        const sharedElementTransitions = [];
        const file = files[index];
        if (isImage(file) && index < 4) {
            sharedElementTransitions.push({
                fromId: `gallery-${file.id}`,
                toId: `image-${file.id}`,
                interpolation: 'accelerateDecelerate',
            });
        }

        let title;
        if (files.length > 1) {
            title = formatMessage({id: 'mobile.gallery.title', defaultMessage: '{index} of {total}'}, {
                index: index + 1,
                total: files.length,
            });
        }
        const options = {
            layout: {
                backgroundColor: '#000',
                componentBackgroundColor: '#000',
            },
            topBar: {
                visible: true,
                background: {
                    color: '#000',
                },
                title: {
                    text: title,
                },
                backButton: {
                    visible: true,
                    icon: closeButton,
                },
            },
            animations: {
                pop: {
                    sharedElementTransitions,
                },
            },
        };

        mergeNavigationOptions(this.props.componentId, options);
    }

    setDownloaderRef = (ref) => {
        this.downloaderRef = ref;
    }

    close = () => {
        const {componentId} = this.props;
        const options = {
            topBar: {
                visible: true,
            },
        };

        mergeNavigationOptions(componentId, options);
        StatusBar.setHidden(false, 'fade');
        popTopScreen(componentId);
    };

    handlePageSelected = (index) => {
        this.setState({index}, this.initHeader);
    };

    handleSwipedVertical = (evt, gestureState) => {
        if (Math.abs(gestureState.dy) > 150) {
            this.close();
        }
    };

    handleTapped = () => {
        const {showHeaderFooter} = this.state;
        const options = {
            topBar: {
                background: {
                    color: '#000',
                },
                visible: !showHeaderFooter,
            },
        };
        if (Platform.OS === 'ios') {
            StatusBar.setHidden(showHeaderFooter, 'slide');
        }
        mergeNavigationOptions(this.props.componentId, options);
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

    // TODO: Remove
    renderDownloadButton = () => {
        const {canDownloadFiles} = this.props;
        const file = this.getCurrentFile();

        if (file?.localPath) {
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
                            name='ellipsis-vertical'
                            size={32}
                            color='#fff'
                        />
                    );
                } else if (file.source || isVideo(file)) {
                    icon = (
                        <Icon
                            name='download-outline'
                            size={26}
                            color='#fff'
                        />
                    );
                }
            }

            return (
                <TouchableOpacity
                    ref={this.headerRef}
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
                <Text
                    style={style.filename}
                    numberOfLines={2}
                    ellipsizeMode='tail'
                >
                    {(files[index] && files[index].name) || ''}
                </Text>
            </Animated.View>
        );
    };

    renderImageComponent = (file) => {
        if (file?.uri) {
            const {deviceHeight, deviceWidth} = this.props;
            const {height, width, uri} = file;
            const statusBar = DeviceTypes.IS_IPHONE_WITH_INSETS ? 60 : 20;
            const calculatedDimensions = calculateDimensions(height, width, deviceWidth, deviceHeight - statusBar);

            return (
                <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                    <FastImage
                        source={{uri}}
                        style={calculatedDimensions}
                        nativeID={`gallery-${file.id}`}
                    />
                </View>
            );
        }

        return null;
    };

    renderOtherItems = (index) => {
        const {files} = this.props;
        const file = files[index];

        if (file) {
            if (isImage(file)) {
                return this.renderImageComponent(file);
            } else if (isDocument(file)) {
                return this.renderAttachmentDocument(file);
            } else if (isVideo(file)) {
                return this.renderVideoPreview(file);
            }

            return this.renderAttachmentIcon(file);
        }

        return <View/>;
    };

    renderVideoPreview = (file) => {
        const {deviceHeight, deviceWidth, theme} = this.props;
        const statusBar = DeviceTypes.IS_IPHONE_WITH_INSETS ? 0 : 20;

        return (
            <VideoPreview
                file={file}
                onFullScreen={this.handleTapped}
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
        const options = [];
        const actions = [];
        let permissionRequest;

        const photo = Permissions.PERMISSIONS.IOS.PHOTO_LIBRARY;
        const hasPermissionToStorage = await Permissions.check(photo);

        switch (hasPermissionToStorage) {
        case Permissions.RESULTS.DENIED:
            permissionRequest = await Permissions.request(photo);
            if (permissionRequest !== Permissions.RESULTS.GRANTED) {
                return;
            }
            break;
        case Permissions.RESULTS.BLOCKED: {
            const grantOption = {
                text: formatMessage({id: 'mobile.permission_denied_retry', defaultMessage: 'Settings'}),
                onPress: () => Permissions.openSettings(),
            };

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
                ],
            );
            return;
        }
        }

        if (isVideo(file)) {
            const path = getLocalFilePathFromFile(VIDEOS_PATH, file);
            const exist = await RNFetchBlob.fs.exists(path);
            if (exist) {
                options.push(formatMessage({
                    id: t('mobile.image_preview.save_video'),
                    defaultMessage: 'Save Video',
                }));
                actions.push(this.saveVideoIOS);
            } else {
                this.showVideoDownloadRequiredAlertIOS();
            }
        } else {
            options.push(formatMessage({
                id: t('mobile.image_preview.save'),
                defaultMessage: 'Save Image',
            }));
            actions.push(this.showDownloader);
        }

        if (options.length) {
            options.push(formatMessage({
                id: 'mobile.post.cancel',
                defaultMessage: 'Cancel',
            }));
            actions.push(emptyFunction);

            BottomSheet.showBottomSheetWithOptions({
                options,
                cancelButtonIndex: options.length - 1,
                title: file.name,
                anchor: this.headerRef.current ? findNodeHandle(this.headerRef.current) : null,
            }, (buttonIndex) => {
                actions[buttonIndex]();
            });
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
            }],
        );
    };

    render() {
        return (
            <>
                <Gallery
                    errorComponent={this.renderOtherItems}
                    imageComponent={this.renderImageComponent}
                    images={this.props.files}
                    initialPage={this.state.index}
                    onPageSelected={this.handlePageSelected}
                    onSingleTapConfirmed={this.handleTapped}
                    onSwipedVertical={this.handleSwipedVertical}
                    pageMargin={2}
                    style={style.flex}
                />
                {this.renderFooter()}
                {this.renderDownloader()}
            </>
        );
    }
}

const style = StyleSheet.create({
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
    headerIcon: {
        height: 44,
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerContainer: {
        height: 99,
        justifyContent: 'center',
        // overflow: 'hidden',
        position: 'absolute',
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    footer: {
        maxHeight: 64,
        justifyContent: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 0,
    },
    filename: {
        color: 'white',
        fontSize: 14,
        marginBottom: 10,
    },
});
