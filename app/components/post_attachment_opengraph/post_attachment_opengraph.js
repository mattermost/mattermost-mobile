// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, Text, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import {intlShape} from 'react-intl';
import parseUrl from 'url-parse';

import {TABLET_WIDTH} from '@components/sidebars/drawer_layout';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {DeviceTypes} from '@constants';
import {generateId} from '@utils/file';
import {openGalleryAtIndex, calculateDimensions} from '@utils/images';
import {getNearestPoint} from '@utils/opengraph';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

const MAX_IMAGE_HEIGHT = 150;
const VIEWPORT_IMAGE_OFFSET = 93;
const VIEWPORT_IMAGE_REPLY_OFFSET = 13;

export default class PostAttachmentOpenGraph extends PureComponent {
    static propTypes = {
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        imagesMetadata: PropTypes.object,
        isReplyPost: PropTypes.bool,
        link: PropTypes.string.isRequired,
        openGraphData: PropTypes.object,
        postId: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.fileId = generateId();
        this.state = this.getBestImageUrlAndDimensions(props.openGraphData);
    }

    componentDidMount() {
        this.mounted = true;

        if (this.state.openGraphImageUrl) {
            this.getImageSize(this.state.openGraphImageUrl);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getBestImageUrlAndDimensions = (data) => {
        if (!data || !data.images) {
            return {
                hasImage: false,
            };
        }

        const {imagesMetadata} = this.props;
        const bestDimensions = {
            width: this.getViewPostWidth(),
            height: MAX_IMAGE_HEIGHT,
        };

        const bestImage = getNearestPoint(bestDimensions, data.images, 'width', 'height');
        const imageUrl = bestImage.secure_url || bestImage.url;

        let ogImage;
        if (imagesMetadata && imagesMetadata[imageUrl]) {
            ogImage = imagesMetadata[imageUrl];
        }

        if (!ogImage) {
            ogImage = data.images.find((i) => i.url === imageUrl || i.secure_url === imageUrl);
        }

        // Fallback when the ogImage does not have dimensions but there is a metaImage defined
        const metaImages = imagesMetadata ? Object.values(imagesMetadata) : null;
        if ((!ogImage?.width || !ogImage?.height) && metaImages?.length) {
            ogImage = metaImages[0];
        }

        let dimensions = bestDimensions;
        if (ogImage?.width && ogImage?.height) {
            dimensions = calculateDimensions(ogImage.height, ogImage.width, this.getViewPostWidth());
        }

        return {
            hasImage: true,
            ...dimensions,
            openGraphImageUrl: imageUrl,
        };
    };

    getFilename = (uri) => {
        const link = decodeURIComponent(uri);
        let filename = parseUrl(link.substr(link.lastIndexOf('/'))).pathname.replace('/', '');
        const extension = filename.split('.').pop();

        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
        }

        return `og-${filename.replace(/:/g, '-')}`;
    };

    getImageSize = (imageUrl) => {
        const {imagesMetadata, openGraphData} = this.props;
        const {openGraphImageUrl} = this.state;

        let ogImage;
        if (imagesMetadata && imagesMetadata[openGraphImageUrl]) {
            ogImage = imagesMetadata[openGraphImageUrl];
        }

        if (!ogImage) {
            ogImage = openGraphData?.images?.find((i) => i.url === openGraphImageUrl || i.secure_url === openGraphImageUrl);
        }

        // Fallback when the ogImage does not have dimensions but there is a metaImage defined
        const metaImages = imagesMetadata ? Object.values(imagesMetadata) : null;
        if ((!ogImage?.width || !ogImage?.height) && metaImages?.length) {
            ogImage = metaImages[0];
        }

        if (ogImage?.width && ogImage?.height) {
            this.setImageSize(imageUrl, ogImage.width, ogImage.height);
        }
    };

    setImageSize = (imageUrl, originalWidth, originalHeight) => {
        if (this.mounted) {
            const dimensions = calculateDimensions(originalHeight, originalWidth, this.getViewPostWidth());

            this.setState({
                imageUrl,
                originalWidth,
                originalHeight,
                ...dimensions,
            });
        }
    };

    getViewPostWidth = () => {
        const {deviceHeight, deviceWidth, isReplyPost} = this.props;
        const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        const viewPortWidth = deviceSize - VIEWPORT_IMAGE_OFFSET - (isReplyPost ? VIEWPORT_IMAGE_REPLY_OFFSET : 0);
        const tabletOffset = DeviceTypes.IS_TABLET ? TABLET_WIDTH : 0;

        return viewPortWidth - tabletOffset;
    };

    goToLink = () => {
        const {intl} = this.context;
        const onError = () => {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.link.error.title',
                    defaultMessage: 'Error',
                }),
                intl.formatMessage({
                    id: 'mobile.link.error.text',
                    defaultMessage: 'Unable to open the link.',
                }),
            );
        };

        tryOpenURL(this.props.link, onError);
    };

    handlePreviewImage = () => {
        const {
            imageUrl: uri,
            openGraphImageUrl: link,
            originalWidth,
            originalHeight,
        } = this.state;
        const filename = this.getFilename(link);
        const extension = filename.split('.').pop();

        const files = [{
            id: this.fileId,
            name: filename,
            extension,
            has_preview_image: true,
            post_id: this.props.postId,
            uri,
            width: originalWidth,
            height: originalHeight,
        }];

        openGalleryAtIndex(0, files);
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
    };

    renderImage = () => {
        if (!this.state.hasImage) {
            return null;
        }

        const {height, openGraphImageUrl, width} = this.state;

        let source;
        if (openGraphImageUrl) {
            source = {
                uri: openGraphImageUrl,
            };
        }

        const style = getStyleSheet(this.props.theme);

        return (
            <View style={[style.imageContainer, {width, height}]}>
                <TouchableWithFeedback
                    onPress={this.handlePreviewImage}
                    type={'none'}
                >
                    <FastImage
                        style={[style.image, {width, height}]}
                        source={source}
                        resizeMode='contain'
                        nativeID={`image-${this.fileId}`}
                    />
                </TouchableWithFeedback>
            </View>
        );
    };

    render() {
        const {
            isReplyPost,
            link,
            openGraphData,
            theme,
        } = this.props;

        const style = getStyleSheet(theme);

        if (!openGraphData) {
            return null;
        }

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
                    <TouchableWithFeedback
                        style={style.flex}
                        onPress={this.goToLink}
                        type={'opacity'}
                    >
                        <Text
                            style={[style.siteSubtitle, {marginRight: isReplyPost ? 10 : 0}]}
                            numberOfLines={3}
                            ellipsizeMode='tail'
                        >
                            {title}
                        </Text>
                    </TouchableWithFeedback>
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
