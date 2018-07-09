// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {Text} from 'react-native';

export default class FormattedTime extends React.PureComponent {
    static propTypes = {
        value: PropTypes.any.isRequired,
        timeZone: PropTypes.string,
        children: PropTypes.func,
        hour12: PropTypes.bool,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    render() {
        const {
            value,
            children,
            timeZone,
            hour12,
        } = this.props;
        const {intl} = this.context;

        const timezoneProps = timeZone ? {timeZone} : {};
        const formattedTime = intl.formatDate(value, {
            ...timezoneProps,
            hour: 'numeric',
            minute: 'numeric',
            hour12,
        });

        if (typeof children === 'function') {
            return children(formattedTime);
        }

        return <Text>{formattedTime}</Text>;
    }
}
