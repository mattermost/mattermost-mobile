// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {ScrollView} from 'react-native';

export default class Table extends React.PureComponent {
    static propTypes = {
        renderRows: PropTypes.func.isRequired,
        tableWidth: PropTypes.number.isRequired,
    };

    render() {
        return (
            <ScrollView contentContainerStyle={{width: this.props.tableWidth}}>
                {this.props.renderRows()}
            </ScrollView>
        );
    }
}
