// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    Image,
    Linking,
    PixelRatio,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {getNearestPoint} from 'app/utils/opengraph';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const LARGE_IMAGE_MIN_WIDTH = 150;
const LARGE_IMAGE_MIN_RATIO = (16 / 9);
const MAX_IMAGE_HEIGHT = 150;
const THUMBNAIL_SIZE = 75;

export default class PostAttachmentOpenGraph extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getOpenGraphMetadata: PropTypes.func.isRequired,
        }).isRequired,
        isReplyPost: PropTypes.bool,
        link: PropTypes.string.isRequired,
        openGraphData: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            imageLoaded: false,
            hasLargeImage: false,
        };
    }

    componentDidMount() {
        this.mounted = true;
        this.getBestImageUrl(this.props.openGraphData);
    }

    componentWillMount() {
        this.fetchData(this.props.link, this.props.openGraphData);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.link !== this.props.link) {
            this.setState({imageLoaded: false});
            this.fetchData(nextProps.link, nextProps.openGraphData);
        }

        if (this.props.openGraphData !== nextProps.openGraphData) {
            this.getBestImageUrl(nextProps.openGraphData);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    calculateLargeImageDimensions = (width, height) => {
        const {width: deviceWidth} = Dimensions.get('window');
        let maxHeight = MAX_IMAGE_HEIGHT;
        let maxWidth = deviceWidth - 88 - (this.props.isReplyPost ? 15 : 0);

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

    calculateSmallImageDimensions = (width, height) => {
        const {width: deviceWidth} = Dimensions.get('window');
        const offset = deviceWidth - 170;

        let ratio;
        let maxWidth;
        let maxHeight;

        if (width >= height) {
            ratio = width / height;
            maxWidth = THUMBNAIL_SIZE;
            maxHeight = PixelRatio.roundToNearestPixel(maxWidth / ratio);
        } else {
            ratio = height / width;
            maxHeight = THUMBNAIL_SIZE;
            maxWidth = PixelRatio.roundToNearestPixel(maxHeight / ratio);
        }

        return {width: maxWidth, height: maxHeight, offset};
    };

    fetchData(url, openGraphData) {
        if (!openGraphData) {
            this.props.actions.getOpenGraphMetadata(url);
        }
    }

    getBestImageUrl(data) {
        if (!data || !data.images) {
            return;
        }

        const bestDimensions = {
            width: Dimensions.get('window').width - 88,
            height: MAX_IMAGE_HEIGHT,
        };
        const bestImage = getNearestPoint(bestDimensions, data.images, 'width', 'height');
        const imageUrl = bestImage.secure_url || bestImage.url;

        if (imageUrl) {
            this.getImageSize(imageUrl);
        }
    }

    getImageSize = (imageUrl) => {
        if (!this.state.imageLoaded) {
            Image.getSize(imageUrl, (width, height) => {
                const {hasLargeImage} = this.state;
                const imageRatio = width / height;

                let isLarge = false;
                let dimensions;
                if (width >= LARGE_IMAGE_MIN_WIDTH && imageRatio >= LARGE_IMAGE_MIN_RATIO && !hasLargeImage) {
                    isLarge = true;
                    dimensions = this.calculateLargeImageDimensions(width, height);
                } else {
                    dimensions = this.calculateSmallImageDimensions(width, height);
                }
                if (this.mounted) {
                    this.setState({
                        ...dimensions,
                        hasLargeImage: isLarge,
                        imageLoaded: true,
                        imageUrl,
                    });
                }
            }, () => null);
        }
    };

    goToLink = () => {
        Linking.openURL(this.props.link);
    };

    render() {
        const {isReplyPost, openGraphData, theme} = this.props;
        const {hasLargeImage, height, imageLoaded, imageUrl, offset, width} = this.state;

        if (!openGraphData || !openGraphData.description) {
            return null;
        }

        const style = getStyleSheet(theme);
        const isThumbnail = !hasLargeImage && imageLoaded;

        return (
            <View style={style.container}>
                <View style={style.flex}>
                    <Text
                        style={style.siteTitle}
                        numberOfLines={1}
                        ellipsizeMode='tail'
                    >
                        {openGraphData.site_name}
                    </Text>
                </View>
                <View style={style.wrapper}>
                    <TouchableOpacity
                        style={isThumbnail ? {width: offset} : style.flex}
                        onPress={this.goToLink}
                    >
                        <Text
                            style={[style.siteSubtitle, {marginRight: isReplyPost ? 10 : 0}]}
                            numberOfLines={3}
                            ellipsizeMode='tail'
                        >
                            {openGraphData.title}
                        </Text>
                    </TouchableOpacity>
                    {isThumbnail &&
                    <View style={style.thumbnail}>
                        <Image
                            style={[style.image, {width, height}]}
                            source={{uri: imageUrl}}
                            resizeMode='cover'
                        />
                    </View>
                    }
                </View>
                <View style={style.flex}>
                    <Text
                        style={style.siteDescription}
                        numberOfLines={5}
                        ellipsizeMode='tail'
                    >
                        {openGraphData.description}
                    </Text>
                </View>
                {hasLargeImage && imageLoaded &&
                <Image
                    style={[style.image, {width, height}]}
                    source={{uri: imageUrl}}
                    resizeMode='cover'
                />
                }
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 1,
            marginTop: 10,
            padding: 10,
        },
        flex: {
            flex: 1,
        },
        wrapper: {
            flex: 1,
            flexDirection: 'row',
        },
        siteTitle: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginBottom: 10,
        },
        siteSubtitle: {
            fontSize: 14,
            color: theme.linkColor,
            marginBottom: 10,
        },
        siteDescription: {
            fontSize: 13,
            color: changeOpacity(theme.centerChannelColor, 0.7),
            marginBottom: 10,
        },
        image: {
            borderRadius: 3,
        },
        thumbnail: {
            flex: 1,
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
        },
    };
});
