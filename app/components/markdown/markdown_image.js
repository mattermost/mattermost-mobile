// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    StyleSheet,
    Text,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';

import CustomPropTypes from 'app/constants/custom_prop_types';

const MAX_IMAGE_HEIGHT = 150;

export default class MarkdownImage extends React.Component {
    static propTypes = {
        children: PropTypes.node,
        source: PropTypes.string.isRequired,
        textStyle: CustomPropTypes.Style
    };

    constructor(props) {
        super(props);

        this.state = {
            width: 0,
            height: 0,
            maxWidth: Math.MAX_INT,
            failed: false
        };

        this.mounted = false;
    }

    componentWillMount() {
        this.loadImageSize(this.props.source);
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.source !== nextProps.source) {
            this.setState({
                width: 0,
                height: 0,
                failed: false
            });

            this.loadImageSize(nextProps.source);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    loadImageSize = (source) => {
        Image.getSize(source, this.handleSizeReceived, this.handleSizeFailed);
    };

    handleSizeReceived = (width, height) => {
        if (!this.mounted) {
            return;
        }

        this.setState({
            width,
            height
        });
    };

    handleSizeFailed = () => {
        if (!this.mounted) {
            return;
        }

        this.setState({
            failed: true
        });
    };

    handleLayout = (event) => {
        if (!this.mounted) {
            return;
        }

        this.setState({
            maxWidth: event.nativeEvent.layout.width
        });
    };

    render() {
        let image = null;

        if (this.state.width && this.state.height && this.state.maxWidth) {
            let {width, height} = this.state;

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
                    source={{uri: this.props.source}}
                    resizeMode='contain'
                    style={{width, height}}
                />
            );
        } else if (this.state.failed) {
            image = (
                <Text>
                    <FormattedText
                        style={this.props.textStyle}
                        id='mobile.markdown.image.error'
                        defaultMessage='Image failed to load:'
                    />
                    {' '}
                    {this.props.children}
                </Text>
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
        flex: 1
    }
});
