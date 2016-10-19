// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {Text} from 'react-native';

import {intlShape} from 'react-intl';

export default class FormattedText extends Component {
    static propTypes = {
        id: PropTypes.string.isRequired,
        defaultMessage: PropTypes.string.isRequired,
        values: PropTypes.object
    };

    static contextTypes = {
        intl: intlShape.isRequired
    };

    render() {
        const {
            id,
            defaultMessage,
            values,
            ...props
        } = this.props;

        return (
            <Text {...props}>
                {this.context.intl.formatMessage({id, defaultMessage}, values)}
            </Text>
        );
    }
}
