// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
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
        tight: PropTypes.bool,
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
            <View style={style.container}>
                <View>
                    <Text style={this.props.bulletStyle}>
                        {bullet}
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
