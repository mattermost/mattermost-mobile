// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {Text} from 'react-native';

import {GlobalStyles} from 'styles';

export default class ErrorText extends React.Component {
    static propTypes = {
        error: React.PropTypes.object
    }

    render() {
        if (!this.props.error) {
            return null;
        }

        let message = 'unknown error type';
        if (typeof this.props.error === 'string' || this.props.error instanceof String) {
            message = this.props.error;
        }

        if (this.props.error.message && this.props.error.message.length > 0) {
            message = this.props.error.message;
        }

        return (<Text style={GlobalStyles.errorLabel}>{message}</Text>);
    }
}