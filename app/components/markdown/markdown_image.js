// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Image, Text} from 'react-native';

export default class MarkdownLink extends React.PureComponent {
    static propTypes = {
        src: PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            width: 0,
            height: 0
        };
    }

    componentWillMount() {
        Image.getSize(this.props.src, this.handleSizeReceived);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.src !== nextProps.src) {
            this.setState({
                width: 0,
                height: 0
            });

            Image.getSize(nextProps.src, this.handleSizeReceived);
        }
    }

    handleSizeReceived = (width, height) => {
        this.setState({
            width,
            height
        });
    }

    render() {
        if (!this.state.width || !this.state.height) {
            return <Text/>;
        }

        let {width, height} = this.state;

        const maxWidth = 200;

        if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
        }

        // React Native complains if we try to pass resizeMode into a StyleSheet
        return (
            <Image
                source={{uri: this.props.src}}
                onLayout={this.handleLayout}
                resizeMode='cover'
                style={{width, height}}
            />
        );
    }
}
