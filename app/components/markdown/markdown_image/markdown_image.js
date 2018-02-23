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
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';

import CustomPropTypes from 'app/constants/custom_prop_types';
import mattermostManaged from 'app/mattermost_managed';
import {normalizeProtocol} from 'app/utils/url';

const MAX_IMAGE_HEIGHT = 150;

const ANDROID_MAX_HEIGHT = 4096;
const ANDROID_MAX_WIDTH = 4096;

export default class MarkdownImage extends React.Component {
    static propTypes = {
        children: PropTypes.node,
        linkDestination: PropTypes.string,
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
            height: 0,
            maxWidth: Math.MAX_INT,
            failed: false,
        };

        this.mounted = false;
    }

    componentWillMount() {
        this.loadImageSize(this.getSource());
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
            this.loadImageSize(this.getSource(nextProps));
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getSource = (props = this.props) => {
        let source = props.source;

        if (source.startsWith('/')) {
            source = props.serverURL + '/' + source;
        }

        return source;
    };

    loadImageSize = (source) => {
        Image.getSize(source, this.handleSizeReceived, this.handleSizeFailed);
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

    render() {
        let image = null;

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
                image = (
                    <Image
                        source={{uri: this.getSource()}}
                        resizeMode='contain'
                        style={[{width, height}, style.image]}
                    />
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
                style={style.container}
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
