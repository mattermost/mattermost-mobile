// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {Text} from 'react-native';

class FormattedTime extends React.PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        value: PropTypes.any.isRequired,
        children: PropTypes.func,
        hour12: PropTypes.bool
    };

    render() {
        const {
            intl,
            value,
            children,
            hour12,
            ...props
        } = this.props;

        // Reflect.deleteProperty(props, 'format');

        // const formattedTime = intl.formatDate(value, {...props, hour: 'numeric', minute: 'numeric'});

        const date = new Date(value);
        const militaryTime = !hour12;

        const hour = militaryTime ? date.getHours() : (date.getHours() % 12 || 12);
        let minute = date.getMinutes();
        minute = minute >= 10 ? minute : ('0' + minute);
        let formattedTime = '';

        if (!militaryTime) {
            formattedTime = (date.getHours() >= 12 ? ' PM' : ' AM');
        }

        if (typeof children === 'function') {
            return children(formattedTime);
        }

        return <Text>{formattedTime}</Text>;
    }
}

export default injectIntl(FormattedTime);
