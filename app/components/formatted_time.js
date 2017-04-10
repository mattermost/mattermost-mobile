// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {Text} from 'react-native';

class FormattedTime extends React.Component {
    static propTypes = {
        intl: intlShape.isRequired,
        value: React.PropTypes.any.isRequired,
        format: React.PropTypes.string,
        children: React.PropTypes.func
    };

    render() {
        const {
            intl,
            value,
            children,
            ...props
        } = this.props;

        Reflect.deleteProperty(props, 'format');

        const formattedTime = intl.formatTime(value, this.props);

        if (typeof children === 'function') {
            return children(formattedTime);
        }

        return <Text>{formattedTime}</Text>;
    }
}

export default injectIntl(FormattedTime);

