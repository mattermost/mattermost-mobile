// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {Text} from 'react-native';
import FormattedText from 'app/components/formatted_text';

import {GlobalStyles} from 'app/styles';

export default class ErrorText extends PureComponent {
    static propTypes = {
        error: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
    };

    static defaultProps = {
        error: {}
    };

    render() {
        if (!this.props.error) {
            return null;
        }

        if (this.props.error.hasOwnProperty('intl')) {
            const {intl} = this.props.error;
            return (
                <FormattedText
                    id={intl.id}
                    defaultMessage={intl.defaultMessage}
                    values={intl.values}
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
