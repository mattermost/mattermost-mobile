// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {Text} from 'react-native';

import FormattedText from 'components/formatted_text';

import {GlobalStyles} from 'styles';

const propTypes = {
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};

export default class ErrorText extends Component {
    static propTypes = propTypes;

    render() {
        if (!this.props.error) {
            return null;
        }

        let message;
        if (typeof this.props.error === 'string' || this.props.error instanceof String) {
            message = this.props.error;
        }

        if (this.props.error.message && this.props.error.message.length > 0) {
            message = this.props.error.message;
        }

        if (message) {
            return (
                <Text style={GlobalStyles.errorLabel}>
                    {message}
                </Text>
            );
        }

        return (
            <FormattedText
                style={GlobalStyles.errorLabel}
                id='components.error_text.unknownError'
                defaultMessage='Unknown error'
            />
        );
    }
}
