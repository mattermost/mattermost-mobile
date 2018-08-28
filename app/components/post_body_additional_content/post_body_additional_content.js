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
import {emptyFunction} from 'app/utils/general';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {previewImageAtIndex, calculateDimensions} from 'app/utils/images';
import {getYouTubeVideoId, isImageLink, isYoutubeLink} from 'app/utils/url';

const VIEWPORT_IMAGE_OFFSET = 66;
const VIEWPORT_IMAGE_REPLY_OFFSET = 13;
const MAX_YOUTUBE_IMAGE_HEIGHT = 150;
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

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            linkLoadError: false,
            linkLoaded: false,
            width: 0,
            height: 0,
            shortenedLink: null,
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

    load = async (props) => {
        const {link} = props;
        if (link) {
            let imageUrl;
            if (isImageLink(link)) {
                imageUrl = link;
            } else if (isYoutubeLink(link)) {
                const videoId = getYouTubeVideoId(link);
                imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                ImageCacheManager.cache(null, `https://i.ytimg.com/vi/${videoId}/default.jpg`, () => true);
            } else {
                const {data} = await this.props.actions.getRedirectLocation(link);

                let shortenedLink;
                if (data && data.location) {
                    shortenedLink = data.location;
                }

                if (shortenedLink) {
                    if (isImageLink(shortenedLink)) {
                        imageUrl = shortenedLink;
                    } else if (isYoutubeLink(shortenedLink)) {
                        const videoId = getYouTubeVideoId(shortenedLink);
                        imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                        ImageCacheManager.cache(null, `https://i.ytimg.com/vi/${videoId}/default.jpg`, () => true);
                    }
                    if (this.mounted) {
                        this.setState({shortenedLink});
                    }
                }
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
                            style={[styles.image, {width, height: imgHeight}]}
                            thumbnailUri={thumbUrl}
                            resizeMode='cover'
                            onError={this.handleLinkLoadError}
                        >
                            <TouchableOpacity onPress={this.playYouTubeVideo}>
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
        const {deviceHeight, deviceWidth, link, isReplyPost} = this.props;
        const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        const viewPortWidth = deviceSize - VIEWPORT_IMAGE_OFFSET - (isReplyPost ? VIEWPORT_IMAGE_REPLY_OFFSET : 0);

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

                let dimensions;
                if (isYoutubeLink(link)) {
                    dimensions = this.calculateYouTubeImageDimensions(width, height);
                } else {
                    dimensions = calculateDimensions(height, width, viewPortWidth);
                }

                this.setState({
                    ...dimensions,
                    originalHeight: height,
                    originalWidth: width,
                    linkLoaded: true,
                    uri,
                });
            }, () => this.setState({linkLoadError: true}));
        }
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
