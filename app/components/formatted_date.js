// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment-timezone';
import {Text} from 'react-native';

export default class FormattedDate extends React.PureComponent {
    static propTypes = {
        format: PropTypes.string,
        timeZone: PropTypes.string,
        value: PropTypes.any.isRequired,
    };

    static defaultProps = {
        format: 'ddd, MMM DD, YYYY',
    };

    render() {
        const {
            format,
            timeZone,
            value,
            ...props
        } = this.props;

        let formattedDate = moment(value).format(format);
        if (timeZone) {
            formattedDate = moment.tz(value, timeZone).format(format);
        }

        return <Text {...props}>{formattedDate}</Text>;
    }
}
