// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    ViewPropTypes,
} from 'react-native';

import FormattedDate from 'app/components/formatted_date';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

// DateHeader accepts as a timestamp for rendering as part of a post list.
export default class DateHeader extends PureComponent {
    static propTypes = {
        date: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
        timeZone: PropTypes.string,
        style: ViewPropTypes.style,
    };

    render() {
        const {theme, timeZone, date} = this.props;
        const style = getStyleSheet(theme);

        const dateFormatProps = {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            value: new Date(date),
        };

        if (timeZone) {
            dateFormatProps.timeZone = timeZone;
        }

        return (
            <View style={[style.container, this.props.style]}>
                <View style={style.line}/>
                <View style={style.dateContainer}>
                    <FormattedDate
                        style={style.date}
                        {...dateFormatProps}
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
            marginTop: 8,
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
