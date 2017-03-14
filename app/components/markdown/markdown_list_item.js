// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Text,
    View
} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class MarkdownListItem extends PureComponent {
    static propTypes = {
        children: CustomPropTypes.Children.isRequired,
        ordered: PropTypes.bool.isRequired,
        startAt: PropTypes.number,
        index: PropTypes.number.isRequired,
        blockStyle: CustomPropTypes.Style,
        bulletStyle: CustomPropTypes.Style
    };

    static defaultProps = {
        startAt: 1
    };

    render() {
        let bullet;
        if (this.props.ordered) {
            bullet = (this.props.startAt + this.props.index) + '. ';
        } else {
            bullet = '• ';
        }

        return (
            <View style={this.props.blockStyle}>
                <Text style={this.props.bulletStyle}>
                    {bullet}
                </Text>
                <View style={{flex: 1}}>{this.props.children}</View>
            </View>
        );
    }
}
