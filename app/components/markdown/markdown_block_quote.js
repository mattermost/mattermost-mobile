// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {
    StyleSheet,
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
        return (
            <View style={style.container}>
                <View>
                    <Text style={this.props.bulletStyle}>
                        {'> '}
                    </Text>
                </View>
                <View>
                    {this.props.children}
                </View>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start'
    }
});
