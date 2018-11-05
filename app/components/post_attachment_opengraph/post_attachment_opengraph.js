// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    Linking,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import ImageCacheManager from 'app/utils/image_cache_manager';
import {previewImageAtIndex, calculateDimensions} from 'app/utils/images';
import {getNearestPoint} from 'app/utils/opengraph';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const MAX_IMAGE_HEIGHT = 150;
const VIEWPORT_IMAGE_OFFSET = 93;
const VIEWPORT_IMAGE_REPLY_OFFSET = 13;

export default class PostAttachmentOpenGraph extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getOpenGraphMetadata: PropTypes.func.isRequired,
        }).isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        isReplyPost: PropTypes.bool,
        link: PropTypes.string.isRequired,
        navigator: PropTypes.object.isRequired,
        openGraphData: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            hasImage: false,
            imageUrl: null,
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
            this.setState({hasImage: false});
            this.fetchData(nextProps.link, nextProps.openGraphData);
        }

        if (this.props.openGraphData !== nextProps.openGraphData) {
            this.getBestImageUrl(nextProps.openGraphData);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

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
            width: this.getViewPostWidth(),
            height: MAX_IMAGE_HEIGHT,
        };

        const bestImage = getNearestPoint(bestDimensions, data.images, 'width', 'height');
        const imageUrl = bestImage.secure_url || bestImage.url;

        this.setState({
            hasImage: true,
            ...bestDimensions,
            openGraphImageUrl: imageUrl,
        });

        if (imageUrl) {
            ImageCacheManager.cache(this.getFilename(imageUrl), imageUrl, this.getImageSize);
        }
    }

    getFilename = (link) => {
        let filename = link.substring(link.lastIndexOf('/') + 1, link.indexOf('?') === -1 ? link.length : link.indexOf('?'));
        const extension = filename.split('.').pop();

        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
        }

        return `og-${filename}`;
    };

    getImageSize = (imageUrl) => {
        Image.getSize(imageUrl, (width, height) => {
            const dimensions = calculateDimensions(height, width, this.getViewPostWidth());

            if (this.mounted) {
                this.setState({
                    ...dimensions,
                    originalHeight: height,
                    originalWidth: width,
                    imageUrl,
                });
            }
        }, () => null);
    };

    getViewPostWidth = () => {
        const {deviceHeight, deviceWidth, isReplyPost} = this.props;
        const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        const viewPortWidth = deviceSize - VIEWPORT_IMAGE_OFFSET - (isReplyPost ? VIEWPORT_IMAGE_REPLY_OFFSET : 0);

        return viewPortWidth;
    };

    goToLink = () => {
        Linking.openURL(this.props.link);
    };

    handlePreviewImage = () => {
        const {
            imageUrl: uri,
            openGraphImageUrl: link,
            originalWidth,
            originalHeight,
        } = this.state;
        const filename = this.getFilename(link);

        const files = [{
            caption: filename,
            dimensions: {
                width: originalWidth,
                height: originalHeight,
            },
            source: {uri},
            data: {
                localPath: uri,
            },
        }];

        previewImageAtIndex(this.props.navigator, [this.refs.item], 0, files);
    };

    renderDescription = () => {
        const {openGraphData} = this.props;
        if (!openGraphData.description) {
            return null;
        }

        const style = getStyleSheet(this.props.theme);

        return (
            <View style={style.flex}>
                <Text
                    style={style.siteDescription}
                    numberOfLines={5}
                    ellipsizeMode='tail'
                >
                    {openGraphData.description}
                </Text>
            </View>
        );
    }

    renderImage = () => {
        if (!this.state.hasImage) {
            return null;
        }

        const {height, imageUrl, width} = this.state;

        let source;
        if (imageUrl) {
            source = {
                uri: imageUrl,
            };
        }

        const style = getStyleSheet(this.props.theme);

        return (
            <View
                ref='item'
                style={style.imageContainer}
            >
                <TouchableWithoutFeedback
                    onPress={this.handlePreviewImage}
                    style={{width, height}}
                >
                    <Image
                        style={[style.image, {width, height}]}
                        source={source}
                        resizeMode='contain'
                    />
                </TouchableWithoutFeedback>
            </View>
        );
    }

    render() {
        const {
            isReplyPost,
            link,
            openGraphData,
            theme,
        } = this.props;

        if (!openGraphData) {
            return null;
        }

        const style = getStyleSheet(theme);

        let siteName;
        if (openGraphData.site_name) {
            siteName = (
                <View style={style.flex}>
                    <Text
                        style={style.siteTitle}
                        numberOfLines={1}
                        ellipsizeMode='tail'
                    >
                        {openGraphData.site_name}
                    </Text>
                </View>
            );
        }

        const title = openGraphData.title || openGraphData.url || link;
        let siteTitle;
        if (title) {
            siteTitle = (
                <View style={style.wrapper}>
                    <TouchableOpacity
                        style={style.flex}
                        onPress={this.goToLink}
                    >
                        <Text
                            style={[style.siteSubtitle, {marginRight: isReplyPost ? 10 : 0}]}
                            numberOfLines={3}
                            ellipsizeMode='tail'
                        >
                            {title}
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={style.container}>
                {siteName}
                {siteTitle}
                {this.renderDescription()}
                {this.renderImage()}
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
            borderRadius: 3,
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
        imageContainer: {
            alignItems: 'center',
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 1,
            borderRadius: 3,
            marginTop: 5,
        },
        image: {
            borderRadius: 3,
        },
    };
});
