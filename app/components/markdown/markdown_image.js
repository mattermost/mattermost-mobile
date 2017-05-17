// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image} from 'react-native';

export default class MarkdownLink extends PureComponent {
    static propTypes = {
        src: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            width: 10000,
            maxWidth: 10000,
            height: 0
        };
    }

    componentWillMount() {
        Image.getSize(this.props.src, this.handleSizeReceived, this.handleSizeFailed);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.src !== nextProps.src) {
            Image.getSize(nextProps.src, this.handleSizeReceived, this.handleSizeFailed);
        }
    }

    handleSizeReceived = (width, height) => {
        this.setState({
            width,
            height
        });
    };

    handleSizeFailed = () => {
        this.setState({
            width: 0,
            height: 0
        });
    }

    handleLayout = (event) => {
        this.setState({
            maxWidth: event.nativeEvent.layout.width
        });
    }

    render() {
        let {width, maxWidth, height} = this.state; // eslint-disable-line prefer-const

        if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
        }

        // React Native complains if we try to pass resizeMode into a StyleSheet
        return (
            <Image
                source={{uri: this.props.src}}
                onLayout={this.handleLayout}
                style={{width, height, flexShrink: 1, resizeMode: 'cover'}}
            />
        );
    }
}
