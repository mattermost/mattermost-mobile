// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {Text} from 'react-native';
import FormattedText from 'app/components/formatted_text';

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

        if (this.props.error.hasOwnProperty('id')) {
            const {error} = this.props;
            return (
                <FormattedText
                    id={error.id}
                    defaultMessage={error.defaultMessage}
                    values={error.values}
                    style={GlobalStyles.errorLabel}
                />
            );
        }

        return (
            <Text style={GlobalStyles.errorLabel}>
                {this.props.error.message || this.props.error}
            </Text>
        );
    }
}
