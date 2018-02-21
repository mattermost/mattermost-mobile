// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {StyleSheet, View} from 'react-native';

export default class MarkdownList extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        ordered: PropTypes.bool.isRequired,
        start: PropTypes.number,
        tight: PropTypes.bool,
    };

    static defaultProps = {
        start: 1,
    };

    render() {
        let bulletWidth = 15;
        if (this.props.ordered) {
            const lastNumber = (this.props.start + this.props.children.length) - 1;
            bulletWidth = (9 * lastNumber.toString().length) + 7;
        }

        const children = React.Children.map(this.props.children, (child) => {
            return React.cloneElement(child, {
                bulletWidth,
                ordered: this.props.ordered,
                tight: this.props.tight,
            });
        });

        return (
            <View style={style.indent}>
                {children}
            </View>
        );
    }
}

const style = StyleSheet.create({
    indent: {
        marginRight: 20,
    },
});
