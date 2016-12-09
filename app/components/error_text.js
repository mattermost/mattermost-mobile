// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {Text} from 'react-native';

import {GlobalStyles} from 'app/styles';

const propTypes = {
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};

export default class ErrorText extends Component {
    static propTypes = propTypes;

    render() {
        if (!this.props.error) {
            return null;
        }

        return (
            <Text style={GlobalStyles.errorLabel}>
                {this.props.error.message || this.props.error}
            </Text>
        );
    }
}
