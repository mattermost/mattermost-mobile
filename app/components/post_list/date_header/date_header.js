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
import {DATE_LINE, DATE_LINE_SUFFIX} from 'app/selectors/post_list';

// DateHeader accepts as a timestamp encoded as a string for rendering as part of a post list.
export default class DateHeader extends PureComponent {
    static propTypes = {
        dateLineString: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        timeZone: PropTypes.string,
        style: ViewPropTypes.style,
    };

    render() {
        const {theme, timeZone, dateLineString} = this.props;
        const style = getStyleSheet(theme);
        const indexSuffix = dateLineString.indexOf(DATE_LINE_SUFFIX);

        let date;
        if (indexSuffix >= 0) {
            date = new Date(parseInt(dateLineString.substring(DATE_LINE.length, indexSuffix), 10));
        } else {
            date = new Date(parseInt(dateLineString.substring(DATE_LINE.length), 10));
        }
        const dateFormatProps = {
            weekday: 'short',
            day: '2-digit',
            mont: 'short',
            year: 'numeric',
            value: date,
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
