// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';

export default class Table extends React.PureComponent {
    static propTypes = {
        renderRows: PropTypes.func.isRequired,
    };

    render() {
        return (
            <ScrollView
                style={style.scrollContainer}
                contentContainerStyle={style.container}
            >
                {this.props.renderRows()}
            </ScrollView>
        );
    }
}

const style = StyleSheet.create({
    scrollContainer: {
        flex: 1,
    },
    container: {
        flexDirection: 'row',
    },
});
