// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {View} from 'react-native';

export default class MarkdownList extends PureComponent {
    static propTypes = {
        containerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.number, PropTypes.array]),
        children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf([PropTypes.node])]).isRequired,
        ordered: PropTypes.bool.isRequired,
        startAt: PropTypes.number
    };

    render() {
        const children = React.Children.map(this.props.children, (child, i) => {
            return React.cloneElement(child, {
                ordered: this.props.ordered,
                startAt: this.props.startAt,
                index: i
            });
        });

        return (
            <View style={this.props.containerStyle}>
                {children}
            </View>
        );
    }
}
