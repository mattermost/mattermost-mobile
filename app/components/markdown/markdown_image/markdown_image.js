// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';
import {
    Clipboard,
    Image,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableHighlight,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import ProgressiveImage from 'app/components/progressive_image';
import CustomPropTypes from 'app/constants/custom_prop_types';
import mattermostManaged from 'app/mattermost_managed';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {normalizeProtocol} from 'app/utils/url';

const MAX_IMAGE_HEIGHT = 150;

const ANDROID_MAX_HEIGHT = 4096;
const ANDROID_MAX_WIDTH = 4096;

export default class MarkdownImage extends React.Component {
    static propTypes = {
        children: PropTypes.node,
        linkDestination: PropTypes.string,
        navigator: PropTypes.object.isRequired,
        onLongPress: PropTypes.func,
        serverURL: PropTypes.string.isRequired,
        source: PropTypes.string.isRequired,
        errorTextStyle: CustomPropTypes.Style,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            width: 0,
            height: MAX_IMAGE_HEIGHT,
            maxWidth: Math.MAX_INT,
            failed: false,
            uri: null,
        };

        this.mounted = false;
    }

    componentWillMount() {
        ImageCacheManager.cache(null, this.getSource(), this.setImageUrl);
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.source !== nextProps.source) {
            this.setState({
                width: 0,
                height: 0,
                failed: false,
            });

            // getSource also depends on serverURL, but that shouldn't change while this is mounted
            ImageCacheManager.cache(null, this.getSource(nextProps), this.setImageUrl);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

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

    getPreviewProps = () => {
        const previewComponent = this.refs.image;
        return previewComponent ? {...previewComponent.props} : {};
    };

    getSource = (props = this.props) => {
        let source = props.source;

        if (source.startsWith('/')) {
            source = props.serverURL + '/' + source;
        }

        return source;
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

    handleSizeReceived = (width, height) => {
        if (!this.mounted) {
            return;
        }

        this.setState({
            width,
            height,
        });
    };

    handleSizeFailed = () => {
        if (!this.mounted) {
            return;
        }

        this.setState({
            failed: true,
        });
    };

    handleLayout = (event) => {
        if (!this.mounted) {
            return;
        }

        this.setState({
            maxWidth: event.nativeEvent.layout.width,
        });
    };

    handleLinkPress = () => {
        const url = normalizeProtocol(this.props.linkDestination);

        Linking.canOpenURL(url).then((supported) => {
            if (supported) {
                Linking.openURL(url);
            }
        });
    };

    handleLinkLongPress = async () => {
        const {formatMessage} = this.context.intl;

        const config = await mattermostManaged.getLocalConfig();

        let action;
        if (config.copyAndPasteProtection !== 'true') {
            action = {
                text: formatMessage({id: 'mobile.markdown.link.copy_url', defaultMessage: 'Copy URL'}),
                onPress: this.handleLinkCopy,
            };
        }

        this.props.onLongPress(action);
    };

    handleLinkCopy = () => {
        Clipboard.setString(this.props.linkDestination);
    };

    handlePreviewImage = () => {
        const component = this.refs.item;

        if (!component) {
            return;
        }

        component.measure((rx, ry, width, height, x, y) => {
            const {uri} = this.state;
            const link = this.getSource();
            let filename = link.substring(link.lastIndexOf('/') + 1, link.indexOf('?') === -1 ? link.length : link.indexOf('?'));
            const extension = filename.split('.').pop();

            if (extension === filename) {
                const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
                filename = `${filename}${ext}`;
            }

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

    loadImageSize = (source) => {
        Image.getSize(source, this.handleSizeReceived, this.handleSizeFailed);
    };

    setImageUrl = (imageURL) => {
        let uri = imageURL;

        if (Platform.OS === 'android') {
            uri = `file://${imageURL}`;
        }

        this.setState({uri});
        this.loadImageSize(uri);
    };

    render() {
        let image = null;
        const {uri} = this.state;

        if (this.state.width && this.state.height && this.state.maxWidth) {
            let {width, height} = this.state;

            if (Platform.OS === 'android' && (width > ANDROID_MAX_WIDTH || height > ANDROID_MAX_HEIGHT)) {
                // Android has a cap on the max image size that can be displayed

                image = (
                    <Text style={this.props.errorTextStyle}>
                        <FormattedText
                            id='mobile.markdown.image.too_large'
                            defaultMessage='Image exceeds max dimensions of {maxWidth} by {maxHeight}:'
                            values={{
                                maxWidth: ANDROID_MAX_WIDTH,
                                maxHeight: ANDROID_MAX_HEIGHT,
                            }}
                        />
                        {' '}
                        {this.props.children}
                    </Text>
                );
            } else {
                const maxWidth = this.state.maxWidth;
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }

                const maxHeight = MAX_IMAGE_HEIGHT;
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }

                // React Native complains if we try to pass resizeMode as a style
                let source = null;
                if (uri) {
                    source = {uri};
                }

                image = (
                    <TouchableWithoutFeedback
                        onLongPress={this.handleLinkLongPress}
                        onPress={this.handlePreviewImage}
                        style={{width, height}}
                    >
                        <ProgressiveImage
                            ref='image'
                            defaultSource={source}
                            resizeMode='contain'
                            style={[{width, height}, style.image]}
                        />
                    </TouchableWithoutFeedback>
                );
            }
        } else if (this.state.failed) {
            image = (
                <Text style={this.props.errorTextStyle}>
                    <FormattedText
                        id='mobile.markdown.image.error'
                        defaultMessage='Image failed to load:'
                    />
                    {' '}
                    {this.props.children}
                </Text>
            );
        }

        if (image && this.props.linkDestination) {
            image = (
                <TouchableHighlight
                    onPress={this.handleLinkPress}
                    onLongPress={this.handleLinkLongPress}
                >
                    {image}
                </TouchableHighlight>
            );
        }

        return (
            <View
                ref='item'
                style={[style.container, {height: Math.min(this.state.height, MAX_IMAGE_HEIGHT)}]}
                onLayout={this.handleLayout}
            >
                {image}
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
    image: {
        marginVertical: 5,
    },
});
