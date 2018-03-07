// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    ViewPropTypes,
} from 'react-native';

import FormattedDate from 'app/components/formatted_date';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class DateHeader extends PureComponent {
    static propTypes = {
        date: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        style: ViewPropTypes.style,
    };

    render() {
        const {date, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={[style.container, this.props.style]}>
                <View style={style.line}/>
                <View style={style.dateContainer}>
                    <FormattedDate
                        style={style.date}
                        value={date}
                        weekday='short'
                        day='2-digit'
                        month='short'
                        year='numeric'
                    />
                </View>
                <View style={style.line}/>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 28,
        },
        dateContainer: {
            marginHorizontal: 15,
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: theme.centerChannelColor,
            opacity: 0.2,
        },
        date: {
            color: theme.centerChannelColor,
            fontSize: 14,
            fontWeight: '600',
        },
    };
});
