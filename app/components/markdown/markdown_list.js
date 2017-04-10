// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {View} from 'react-native';

export default class MarkdownList extends PureComponent {
    static propTypes = {
        children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf([PropTypes.node])]).isRequired,
        ordered: PropTypes.bool.isRequired,
        startAt: PropTypes.number,
        tight: PropTypes.bool
    };

    render() {
        const children = React.Children.map(this.props.children, (child, i) => {
            return React.cloneElement(child, {
                ordered: this.props.ordered,
                startAt: this.props.startAt,
                index: i,
                tight: this.props.tight
            });
        });

        return (
            <View style={{marginRight: 20}}>
                {children}
            </View>
        );
    }
}
