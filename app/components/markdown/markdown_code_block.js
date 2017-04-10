// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {ScrollView, Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class MarkdownCodeBlock extends PureComponent {
    static propTypes = {
        children: CustomPropTypes.Children,
        blockStyle: CustomPropTypes.Style,
        textStyle: CustomPropTypes.Style
    };

    render() {
        return (
            <ScrollView
                style={this.props.blockStyle}
                horizontal={true}
            >
                <Text style={this.props.textStyle}>
                    {this.props.children}
                </Text>
            </ScrollView>
        );
    }
}
