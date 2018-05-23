// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    Linking,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {YouTubeStandaloneAndroid, YouTubeStandaloneIOS} from 'react-native-youtube';
import youTubeVideoId from 'youtube-video-id';

import ProgressiveImage from 'app/components/progressive_image';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {emptyFunction} from 'app/utils/general';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {isImageLink, isYoutubeLink} from 'app/utils/url';

const MAX_IMAGE_HEIGHT = 150;

let MessageAttachments;
let PostAttachmentOpenGraph;

export default class PostBodyAdditionalContent extends PureComponent {
    static propTypes = {
        baseTextStyle: CustomPropTypes.Style,
        blockStyles: PropTypes.object,
        config: PropTypes.object,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        isReplyPost: PropTypes.bool,
        link: PropTypes.string,
        message: PropTypes.string.isRequired,
        navigator: PropTypes.object.isRequired,
        onLongPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        openGraphData: PropTypes.object,
        postId: PropTypes.string.isRequired,
        postProps: PropTypes.object.isRequired,
        showLinkPreviews: PropTypes.bool.isRequired,
        textStyles: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        onLongPress: emptyFunction,
    };

    constructor(props) {
        super(props);

        this.state = {
            linkLoadError: false,
            linkLoaded: false,
            width: 0,
            height: 0,
        };

        this.mounted = false;
    }

    componentWillMount() {
        this.mounted = true;
        this.load(this.props);
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.link !== nextProps.link) {
            this.load(nextProps);
        }
    }

    load = (props) => {
        const {link} = props;
        if (link) {
            let imageUrl;
            if (isImageLink(link)) {
                imageUrl = link;
            } else if (isYoutubeLink(link)) {
                const videoId = youTubeVideoId(link);
                imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                ImageCacheManager.cache(null, `https://i.ytimg.com/vi/${videoId}/default.jpg`, () => true);
            }

            if (imageUrl) {
                ImageCacheManager.cache(null, imageUrl, this.getImageSize);
            }
        }
    };

    calculateDimensions = (width, height) => {
        const {deviceHeight, deviceWidth} = this.props;
        let maxHeight = MAX_IMAGE_HEIGHT;
        const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        let maxWidth = deviceSize - 78;

        if (height <= MAX_IMAGE_HEIGHT) {
            maxHeight = height;
        } else {
            maxHeight = (height / width) * maxWidth;
            if (maxHeight > MAX_IMAGE_HEIGHT) {
                maxHeight = MAX_IMAGE_HEIGHT;
            }
        }

        if (height > width) {
            maxWidth = (width / height) * maxHeight;
        }

        return {width: maxWidth, height: maxHeight};
    };

    generateStaticEmbed = (isYouTube, isImage) => {
        if (isYouTube || isImage) {
            return null;
        }

        const {isReplyPost, link, navigator, openGraphData, showLinkPreviews, theme} = this.props;
        const attachments = this.getMessageAttachment();
        if (attachments) {
            return attachments;
        }

        if (link && showLinkPreviews) {
            if (!PostAttachmentOpenGraph) {
                PostAttachmentOpenGraph = require('app/components/post_attachment_opengraph').default;
            }
            return (
                <PostAttachmentOpenGraph
                    isReplyPost={isReplyPost}
                    link={link}
                    navigator={navigator}
                    openGraphData={openGraphData}
                    theme={theme}
                />
            );
        }

        return null;
    };

    generateToggleableEmbed = (isImage, isYouTube) => {
        const {link} = this.props;
        const {width, height, uri} = this.state;
        const imgHeight = height || MAX_IMAGE_HEIGHT;

        if (link) {
            if (isYouTube) {
                const videoId = youTubeVideoId(link);
                const imgUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                const thumbUrl = `https://i.ytimg.com/vi/${videoId}/default.jpg`;

                return (
                    <TouchableWithoutFeedback
                        style={[styles.imageContainer, {height: imgHeight}]}
                        {...this.responder}
                        onPress={this.playYouTubeVideo}
                    >
                        <ProgressiveImage
                            isBackgroundImage={true}
                            imageUri={imgUrl}
                            style={[styles.image, {width, height: imgHeight}]}
                            thumbnailUri={thumbUrl}
                            resizeMode='cover'
                            onError={this.handleLinkLoadError}
                        >
                            <TouchableWithoutFeedback onPress={this.playYouTubeVideo}>
                                <Image
                                    source={require('assets/images/icons/youtube-play-icon.png')}
                                    onPress={this.playYouTubeVideo}
                                />
                            </TouchableWithoutFeedback>
                        </ProgressiveImage>
                    </TouchableWithoutFeedback>
                );
            }

            if (isImage) {
                return (
                    <TouchableWithoutFeedback
                        onPress={this.handlePreviewImage}
                        style={[styles.imageContainer, {height: imgHeight}]}
                        {...this.responder}
                    >
                        <View ref='item'>
                            <ProgressiveImage
                                ref='image'
                                style={[styles.image, {width, height: imgHeight}]}
                                defaultSource={{uri}}
                                resizeMode='cover'
                                onError={this.handleLinkLoadError}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                );
            }
        }

        return null;
    };

    getImageSize = (path) => {
        const {link} = this.props;

        if (link && path) {
            let prefix = '';
            if (Platform.OS === 'android') {
                prefix = 'file://';
            }

            const uri = `${prefix}${path}`;
            Image.getSize(uri, (width, height) => {
                if (!this.mounted) {
                    return;
                }

                if (!width && !height) {
                    this.setState({linkLoadError: true});
                    return;
                }

                const dimensions = this.calculateDimensions(width, height);
                this.setState({...dimensions, linkLoaded: true, uri});
            }, () => this.setState({linkLoadError: true}));
        }
    };

    getItemMeasures = (index, cb) => {
        const activeComponent = this.refs.item;

        if (!activeComponent) {
            cb(null);
            return;
        }

        activeComponent.measure((rx, ry, width, height, x, y) => {
            cb({
                origin: {x, y, width, height},
            });
        });
    };

    getMessageAttachment = () => {
        const {
            postId,
            postProps,
            baseTextStyle,
            blockStyles,
            navigator,
            onPermalinkPress,
            textStyles,
            theme,
        } = this.props;
        const {attachments} = postProps;

        if (attachments && attachments.length) {
            if (!MessageAttachments) {
                MessageAttachments = require('app/components/message_attachments').default;
            }

            return (
                <MessageAttachments
                    attachments={attachments}
                    baseTextStyle={baseTextStyle}
                    blockStyles={blockStyles}
                    navigator={navigator}
                    postId={postId}
                    textStyles={textStyles}
                    theme={theme}
                    onLongPress={this.props.onLongPress}
                    onPermalinkPress={onPermalinkPress}
                />
            );
        }

        return null;
    };

    getPreviewProps = () => {
        const previewComponent = this.refs.image;
        return previewComponent ? {...previewComponent.props} : {};
    };

    goToImagePreview = (passProps) => {
        this.props.navigator.showModal({
            screen: 'ImagePreview',
            title: '',
            animationType: 'none',
            passProps,
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext',
            },
        });
    };

    handleLinkLoadError = () => {
        this.setState({linkLoadError: true});
    };

    handlePreviewImage = () => {
        const component = this.refs.item;

        if (!component) {
            return;
        }

        component.measure((rx, ry, width, height, x, y) => {
            const {link} = this.props;
            const {uri} = this.state;
            const filename = link.substring(link.lastIndexOf('/') + 1, link.indexOf('?') === -1 ? link.length : link.indexOf('?'));
            const files = [{
                caption: filename,
                source: {uri},
                data: {
                    localPath: uri,
                },
            }];

            this.goToImagePreview({
                index: 0,
                origin: {x, y, width, height},
                target: {x: 0, y: 0, opacity: 1},
                files,
                getItemMeasures: this.getItemMeasures,
                getPreviewProps: this.getPreviewProps,
            });
        });
    };

    playYouTubeVideo = () => {
        const {link} = this.props;
        const videoId = youTubeVideoId(link);

        if (Platform.OS === 'ios') {
            YouTubeStandaloneIOS.playVideo(videoId);
        } else {
            const {config} = this.props;

            if (config.GoogleDeveloperKey) {
                YouTubeStandaloneAndroid.playVideo({
                    apiKey: config.GoogleDeveloperKey,
                    videoId,
                    autoplay: true,
                });
            } else {
                Linking.openURL(link);
            }
        }
    };

    render() {
        const {link, openGraphData, postProps} = this.props;
        const {linkLoadError} = this.state;
        const {attachments} = postProps;

        if (!link && !attachments) {
            return null;
        }

        const isYouTube = isYoutubeLink(link);
        const isImage = isImageLink(link);
        const isOpenGraph = Boolean(openGraphData && openGraphData.description);

        if (((isImage && !isOpenGraph) || isYouTube) && !linkLoadError) {
            const embed = this.generateToggleableEmbed(isImage, isYouTube);
            if (embed) {
                return embed;
            }
        }

        return this.generateStaticEmbed(isYouTube, isImage && !linkLoadError);
    }
}

const styles = StyleSheet.create({
    imageContainer: {
        alignItems: 'flex-start',
        flex: 1,
        justifyContent: 'flex-start',
        marginBottom: 6,
        marginTop: 10,
    },
    image: {
        alignItems: 'center',
        borderRadius: 3,
        justifyContent: 'center',
        marginVertical: 1,
    },
});
