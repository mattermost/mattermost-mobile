// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {
    Text,
    View
} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class MarkdownBlockQuote extends PureComponent {
    static propTypes = {
        blockStyle: CustomPropTypes.Style,
        bulletStyle: CustomPropTypes.Style,
        children: CustomPropTypes.Children.isRequired
    };

    render() {
        // Inject the text style in case the children of this node are plain text which wouldn't
        // get the text style from anywhere else
        // const children = React.Children.map(this.props.children, (child) => {
        //     return React.cloneElement(child, {
        //         style: this.props.textStyle
        //     });
        // });
        const children = this.props.children;

        return (
            <View style={this.props.blockStyle}>
                <Text style={this.props.bulletStyle}>
                    {'> '}
                </Text>
                <View>{children}</View>
            </View>
        );
    }
}
