// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Image,
    Linking,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    TouchableOpacity,
    View,
} from 'react-native';
import {YouTubeStandaloneAndroid, YouTubeStandaloneIOS} from 'react-native-youtube';
import {intlShape} from 'react-intl';

import ProgressiveImage from 'app/components/progressive_image';

import CustomPropTypes from 'app/constants/custom_prop_types';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {previewImageAtIndex, calculateDimensions} from 'app/utils/images';
import {getYouTubeVideoId, isImageLink, isYoutubeLink} from 'app/utils/url';

const VIEWPORT_IMAGE_OFFSET = 66;
const VIEWPORT_IMAGE_REPLY_OFFSET = 13;
const MAX_YOUTUBE_IMAGE_HEIGHT = 150;
const MAX_YOUTUBE_IMAGE_WIDTH = 297;
let MessageAttachments;
let PostAttachmentOpenGraph;

export default class PostBodyAdditionalContent extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getRedirectLocation: PropTypes.func.isRequired,
        }).isRequired,
        baseTextStyle: CustomPropTypes.Style,
        blockStyles: PropTypes.object,
        googleDeveloperKey: PropTypes.string,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        expandedLink: PropTypes.string,
        metadata: PropTypes.object,
        isReplyPost: PropTypes.bool,
        link: PropTypes.string,
        message: PropTypes.string.isRequired,
        navigator: PropTypes.object.isRequired,
        onHashtagPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        openGraphData: PropTypes.object,
        postId: PropTypes.string.isRequired,
        postProps: PropTypes.object.isRequired,
        showLinkPreviews: PropTypes.bool.isRequired,
        textStyles: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        let dimensions = {
            height: 0,
            width: 0,
        };

        if (this.isImage() && props.metadata && props.metadata.images) {
            const img = props.metadata.images[props.link];
            if (img && img.height && img.width) {
                dimensions = calculateDimensions(img.height, img.width, this.getViewPortWidth(props));
            }
        }

        this.state = {
            linkLoadError: false,
            linkLoaded: false,
            shortenedLink: null,
            ...dimensions,
        };

        this.mounted = false;
    }

    componentWillMount() {
        this.mounted = true;
        this.load();
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    componentDidUpdate(prevProps) {
        const link = this.props.expandedLink || this.props.link;
        const prevLink = prevProps.expandedLink || prevProps.link;
        if (link !== prevLink) {
            this.load();
        }
    }

    isImage = (specificLink) => {
        const {metadata, link} = this.props;

        if (isImageLink(specificLink || link)) {
            return true;
        }

        if (metadata && metadata.images) {
            return Boolean(metadata.images[specificLink] || metadata.images[link]);
        }

        return false;
    };

    load = () => {
        const link = this.props.expandedLink || this.props.link;
        if (link) {
            let imageUrl;
            if (this.isImage()) {
                imageUrl = link;
            } else if (isYoutubeLink(link)) {
                const videoId = getYouTubeVideoId(link);
                imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                ImageCacheManager.cache(null, `https://i.ytimg.com/vi/${videoId}/default.jpg`, () => true);
            } else if (!this.props.expandedLink) {
                this.props.actions.getRedirectLocation(link);
            }

            if (imageUrl) {
                ImageCacheManager.cache(null, imageUrl, this.getImageSize);
            }
        }
    };

    calculateYouTubeImageDimensions = (width, height) => {
        const {deviceHeight, deviceWidth} = this.props;
        let maxHeight = MAX_YOUTUBE_IMAGE_HEIGHT;
        const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        let maxWidth = deviceSize - 78;

        if (height <= MAX_YOUTUBE_IMAGE_HEIGHT) {
            maxHeight = height;
        } else {
            maxHeight = (height / width) * maxWidth;
            if (maxHeight > MAX_YOUTUBE_IMAGE_HEIGHT) {
                maxHeight = MAX_YOUTUBE_IMAGE_HEIGHT;
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

        const {isReplyPost, link, metadata, navigator, openGraphData, showLinkPreviews, theme} = this.props;
        const attachments = this.getMessageAttachment();
        if (attachments) {
            return attachments;
        }

        if (!openGraphData) {
            return null;
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
                    imageMetadata={metadata && metadata.images}
                    theme={theme}
                />
            );
        }

        return null;
    };

    generateToggleableEmbed = (isImage, isYouTube) => {
        let {link} = this.props;
        const {shortenedLink} = this.state;
        if (shortenedLink) {
            link = shortenedLink;
        }
        const {width, height, uri} = this.state;
        const imgHeight = height;

        if (link) {
            if (isYouTube) {
                const videoId = getYouTubeVideoId(link);
                const imgUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                const thumbUrl = `https://i.ytimg.com/vi/${videoId}/default.jpg`;

                return (
                    <TouchableOpacity
                        style={[styles.imageContainer, {height: imgHeight || MAX_YOUTUBE_IMAGE_HEIGHT}]}
                        {...this.responder}
                        onPress={this.playYouTubeVideo}
                    >
                        <ProgressiveImage
                            isBackgroundImage={true}
                            imageUri={imgUrl}
                            style={[styles.image, {width: width || MAX_YOUTUBE_IMAGE_WIDTH, height: imgHeight || MAX_YOUTUBE_IMAGE_HEIGHT}]}
                            thumbnailUri={thumbUrl}
                            resizeMode='cover'
                            onError={this.handleLinkLoadError}
                        >
                            <TouchableOpacity
                                style={styles.playButton}
                                onPress={this.playYouTubeVideo}
                            >
                                <Image
                                    source={require('assets/images/icons/youtube-play-icon.png')}
                                    onPress={this.playYouTubeVideo}
                                />
                            </TouchableOpacity>
                        </ProgressiveImage>
                    </TouchableOpacity>
                );
            }

            if (isImage) {
                return (
                    <TouchableWithoutFeedback
                        onPress={this.handlePreviewImage}
                        style={[styles.imageContainer, {height: imgHeight || MAX_YOUTUBE_IMAGE_HEIGHT}]}
                        {...this.responder}
                    >
                        <View ref='item'>
                            <ProgressiveImage
                                ref='image'
                                style={[styles.image, {width, height: imgHeight || MAX_YOUTUBE_IMAGE_HEIGHT}]}
                                defaultSource={{uri}}
                                resizeMode='contain'
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
        const {link, metadata} = this.props;
        let img;

        if (link && path) {
            if (metadata && metadata.images) {
                img = metadata.images[link];
            }

            if (img && img.height && img.width) {
                this.setImageSize(path, img.width, img.height);
            } else {
                Image.getSize(path, (width, height) => {
                    this.setImageSize(path, width, height);
                }, () => this.setState({linkLoadError: true}));
            }
        }
    };

    getViewPortWidth = (props) => {
        const {deviceHeight, deviceWidth, isReplyPost} = props;
        const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        return deviceSize - VIEWPORT_IMAGE_OFFSET - (isReplyPost ? VIEWPORT_IMAGE_REPLY_OFFSET : 0);
    };

    setImageSize = (uri, originalWidth, originalHeight) => {
        if (!this.mounted) {
            return;
        }

        if (!originalWidth && !originalHeight) {
            this.setState({linkLoadError: true});
            return;
        }

        const {link} = this.props;
        const viewPortWidth = this.getViewPortWidth(this.props);

        let dimensions;
        if (isYoutubeLink(link)) {
            dimensions = this.calculateYouTubeImageDimensions(originalWidth, originalHeight);
        } else {
            dimensions = calculateDimensions(originalHeight, originalWidth, viewPortWidth);
        }

        this.setState({
            ...dimensions,
            originalHeight,
            originalWidth,
            linkLoaded: true,
            uri,
        });
    };

    getMessageAttachment = () => {
        const {
            postId,
            postProps,
            baseTextStyle,
            blockStyles,
            deviceHeight,
            deviceWidth,
            metadata,
            navigator,
            onHashtagPress,
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
                    deviceHeight={deviceHeight}
                    deviceWidth={deviceWidth}
                    metadata={metadata}
                    navigator={navigator}
                    postId={postId}
                    textStyles={textStyles}
                    theme={theme}
                    onHashtagPress={onHashtagPress}
                    onPermalinkPress={onPermalinkPress}
                />
            );
        }

        return null;
    };

    getYouTubeTime = (link) => {
        const timeRegex = /[\\?&](t|start|time_continue)=([0-9]+h)?([0-9]+m)?([0-9]+s?)/;

        const time = link.match(timeRegex);
        if (!time || !time[0]) {
            return 0;
        }

        const hours = time[2] ? time[2].match(/([0-9]+)h/) : null;
        const minutes = time[3] ? time[3].match(/([0-9]+)m/) : null;
        const seconds = time[4] ? time[4].match(/([0-9]+)s?/) : null;

        let ticks = 0;

        if (hours && hours[1]) {
            ticks += parseInt(hours[1], 10) * 3600;
        }

        if (minutes && minutes[1]) {
            ticks += parseInt(minutes[1], 10) * 60;
        }

        if (seconds && seconds[1]) {
            ticks += parseInt(seconds[1], 10);
        }

        return ticks;
    };

    handleLinkLoadError = () => {
        this.setState({linkLoadError: true});
    };

    handlePreviewImage = () => {
        const {shortenedLink} = this.state;
        let {link} = this.props;
        const {navigator} = this.props;
        if (shortenedLink) {
            link = shortenedLink;
        }
        const {
            originalHeight,
            originalWidth,
            uri,
        } = this.state;
        const filename = link.substring(link.lastIndexOf('/') + 1, link.indexOf('?') === -1 ? link.length : link.indexOf('?'));
        const files = [{
            caption: filename,
            source: {uri},
            dimensions: {
                width: originalWidth,
                height: originalHeight,
            },
            data: {
                localPath: uri,
            },
        }];

        previewImageAtIndex(navigator, [this.refs.item], 0, files);
    };

    playYouTubeVideo = () => {
        const {link} = this.props;
        const videoId = getYouTubeVideoId(link);
        const startTime = this.getYouTubeTime(link);

        if (Platform.OS === 'ios') {
            YouTubeStandaloneIOS.
                playVideo(videoId, startTime).
                catch(this.playYouTubeVideoError);
        } else {
            const {googleDeveloperKey} = this.props;

            if (googleDeveloperKey) {
                YouTubeStandaloneAndroid.playVideo({
                    apiKey: googleDeveloperKey,
                    videoId,
                    autoplay: true,
                    startTime,
                }).catch(this.playYouTubeVideoError);
            } else {
                Linking.openURL(link);
            }
        }
    };

    playYouTubeVideoError = (errorMessage) => {
        const {formatMessage} = this.context.intl;

        Alert.alert(
            formatMessage({
                id: 'mobile.youtube_playback_error.title',
                defaultMessage: 'YouTube playback error',
            }),
            formatMessage({
                id: 'mobile.youtube_playback_error.description',
                defaultMessage: 'An error occurred while trying to play the YouTube video.\nDetails: {details}',
            }, {
                details: errorMessage,
            }),
        );
    };

    render() {
        let {link} = this.props;
        const {openGraphData, postProps} = this.props;
        const {linkLoadError, shortenedLink} = this.state;
        if (shortenedLink) {
            link = shortenedLink;
        }
        const {attachments} = postProps;

        if (!link && !attachments) {
            return null;
        }

        const isYouTube = isYoutubeLink(link);
        const isImage = this.isImage(link);
        const isOpenGraph = Boolean(openGraphData);

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
    playButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
