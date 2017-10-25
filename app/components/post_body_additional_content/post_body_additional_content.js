// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    Linking,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import {YouTubeStandaloneAndroid, YouTubeStandaloneIOS} from 'react-native-youtube';
import youTubeVideoId from 'youtube-video-id';

import youtubePlayIcon from 'assets/images/icons/youtube-play-icon.png';

import PostAttachmentOpenGraph from 'app/components/post_attachment_opengraph';
import SlackAttachments from 'app/components/slack_attachments';
import CustomPropTypes from 'app/constants/custom_prop_types';
import {emptyFunction} from 'app/utils/general';
import {isImageLink, isYoutubeLink} from 'app/utils/url';

const MAX_IMAGE_HEIGHT = 150;

export default class PostBodyAdditionalContent extends PureComponent {
    static propTypes = {
        baseTextStyle: CustomPropTypes.Style,
        blockStyles: PropTypes.object,
        config: PropTypes.object,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        link: PropTypes.string,
        message: PropTypes.string.isRequired,
        navigator: PropTypes.object.isRequired,
        onLongPress: PropTypes.func,
        openGraphData: PropTypes.object,
        postProps: PropTypes.object.isRequired,
        showLinkPreviews: PropTypes.bool.isRequired,
        textStyles: PropTypes.object,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        onLongPress: emptyFunction
    }

    constructor(props) {
        super(props);

        this.state = {
            linkLoadError: false,
            linkLoaded: false
        };

        this.mounted = false;
    }

    componentDidMount() {
        this.mounted = true;
        this.getImageSize();
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.message !== this.props.message) {
            this.setState({
                linkLoadError: false,
                linkLoaded: false
            }, () => {
                this.getImageSize();
            });
        }
    }

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

        const {link, openGraphData, showLinkPreviews, theme} = this.props;
        const attachments = this.getSlackAttachment();
        if (attachments) {
            return attachments;
        }

        if (link && showLinkPreviews) {
            return (
                <PostAttachmentOpenGraph
                    link={link}
                    openGraphData={openGraphData}
                    theme={theme}
                />
            );
        }

        return null;
    };

    getImageSize = () => {
        const {link} = this.props;
        const {linkLoaded} = this.state;

        if (link) {
            let imageUrl;
            if (isImageLink(link)) {
                imageUrl = link;
            } else if (isYoutubeLink(link)) {
                const videoId = youTubeVideoId(link);
                imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }

            if (imageUrl && !linkLoaded) {
                Image.getSize(imageUrl, (width, height) => {
                    if (!this.mounted) {
                        return;
                    }

                    const dimensions = this.calculateDimensions(width, height);
                    this.setState({...dimensions, linkLoaded: true});
                }, () => null);
            }
        }
    };

    getSlackAttachment = () => {
        const {
            postProps,
            baseTextStyle,
            blockStyles,
            navigator,
            textStyles,
            theme
        } = this.props;
        const {attachments} = postProps;

        if (attachments && attachments.length) {
            return (
                <SlackAttachments
                    attachments={attachments}
                    baseTextStyle={baseTextStyle}
                    blockStyles={blockStyles}
                    navigator={navigator}
                    textStyles={textStyles}
                    theme={theme}
                    onLongPress={this.props.onLongPress}
                />
            );
        }

        return null;
    };

    generateToggleableEmbed = (isImage, isYouTube) => {
        const {link} = this.props;
        const {width, height} = this.state;

        if (link) {
            if (isYouTube) {
                const videoId = youTubeVideoId(link);
                const imgUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                return (
                    <TouchableWithoutFeedback
                        style={styles.imageContainer}
                        {...this.responder}
                        onPress={this.playYouTubeVideo}
                    >
                        <Image
                            style={[styles.image, {width, height}]}
                            source={{uri: imgUrl}}
                            resizeMode={'cover'}
                            onError={this.handleLinkLoadError}
                        >
                            <TouchableWithoutFeedback onPress={this.playYouTubeVideo}>
                                <Image
                                    source={youtubePlayIcon}
                                    onPress={this.playYouTubeVideo}
                                />
                            </TouchableWithoutFeedback>
                        </Image>
                    </TouchableWithoutFeedback>
                );
            }

            if (isImage) {
                return (
                    <View style={styles.imageContainer}>
                        <Image
                            style={[styles.image, {width, height}]}
                            source={{uri: link}}
                            resizeMode={'cover'}
                            onError={this.handleLinkLoadError}
                        />
                    </View>
                );
            }
        }

        return null;
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
                    autoplay: true
                });
            } else {
                Linking.openURL(link);
            }
        }
    };

    handleLinkLoadError = () => {
        this.setState({linkLoadError: true});
    };

    render() {
        const {link, openGraphData, postProps} = this.props;
        const {linkLoaded, linkLoadError} = this.state;
        const {attachments} = postProps;

        if (!link && !attachments) {
            return null;
        }

        const isYouTube = isYoutubeLink(link);
        const isImage = isImageLink(link);
        const isOpenGraph = Boolean(openGraphData && openGraphData.description);

        if (((isImage && !isOpenGraph) || isYouTube) && !linkLoadError) {
            const embed = this.generateToggleableEmbed(isImage, isYouTube);
            if (embed && (linkLoaded || isYouTube)) {
                return embed;
            }
        }

        return this.generateStaticEmbed(isYouTube, isImage);
    }
}

const styles = StyleSheet.create({
    imageContainer: {
        alignItems: 'flex-start',
        flex: 1,
        justifyContent: 'flex-start',
        marginBottom: 6,
        marginTop: 10
    },
    image: {
        alignItems: 'center',
        borderRadius: 3,
        justifyContent: 'center',
        marginVertical: 1
    }
});
