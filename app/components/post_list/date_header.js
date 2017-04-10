// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {StyleSheet, View} from 'react-native';

import FormattedDate from 'app/components/formatted_date';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 28
        },
        dateContainer: {
            marginHorizontal: 15
        },
        line: {
            flex: 1,
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.centerChannelColor,
            opacity: 0.2
        },
        date: {
            color: theme.centerChannelColor,
            fontSize: 14,
            fontWeight: '600'
        }
    });
});

function DateHeader(props) {
    const style = getStyleSheet(props.theme);

    return (
        <View style={[style.container, props.style]}>
            <View style={style.line}/>
            <View style={style.dateContainer}>
                <FormattedDate
                    style={style.date}
                    value={props.date}
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

DateHeader.propTypes = {
    date: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired,
    style: View.propTypes.style
};

export default DateHeader;
