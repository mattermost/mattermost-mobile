// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {type StyleProp, Text, type TextStyle, View, type ViewStyle} from 'react-native';

import FormattedDate, {type FormattedDateFormat} from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {isSameYear, isToday, isYesterday} from '@utils/datetime';
import {logDebug} from '@utils/log';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type DateSeparatorProps = {
    date: number | Date;
    style?: StyleProp<Intersection<TextStyle, ViewStyle>>;
    timezone?: string | null;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            marginVertical: 8,
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: theme.centerChannelColor,
            opacity: 0.1,
        },
        date: {
            color: theme.centerChannelColor,
            marginHorizontal: 12,
            ...typography('Body', 75, 'SemiBold'),
        },
    };
});

const AFTER_YEAR_FORMAT: FormattedDateFormat = {dateStyle: 'medium'};

/**
 * Formats a date without the year component using dateStyle:'medium' and formatToParts.
 * This avoids a Hermes bug where {month:'short', day:'numeric'} may omit the day
 * on certain Android versions.
 */
function formatDateWithoutYear(locale: string, date: Date, timezone?: string | null): string | null {
    try {
        let timeZone: string | undefined;
        if (timezone && typeof timezone === 'string') {
            timeZone = timezone;
        }

        const parts = [...new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            ...(timeZone ? {timeZone} : {}),
        }).formatToParts(date)];

        const yearIdx = parts.findIndex((p) => p.type === 'year');
        if (yearIdx < 0) {
            return parts.map((p) => p.value).join('');
        }

        if (yearIdx === 0) {
            // Year at start (e.g. ja, zh, ko, hu): remove year + following literal
            const removeCount = parts[1]?.type === 'literal' ? 2 : 1;
            parts.splice(0, removeCount);
        } else if (yearIdx === parts.length - 1) {
            // Year at end (e.g. en, de, fr): remove preceding literal + year
            const start = parts[yearIdx - 1]?.type === 'literal' ? yearIdx - 1 : yearIdx;
            parts.splice(start, parts.length - start);
        } else {
            // Year in middle (e.g. ru, uk, bg with trailing suffix): remove adjacent literals + year
            let start = yearIdx;
            let count = 1;
            if (parts[yearIdx - 1]?.type === 'literal') {
                start--;
                count++;
            }
            if (parts[yearIdx + 1]?.type === 'literal') {
                count++;
            }
            parts.splice(start, count);
        }

        return parts.map((p) => p.value).join('');
    } catch (error) {
        logDebug('Failed to format date without year', error);
        return null;
    }
}

const RecentDate = (props: DateSeparatorProps) => {
    const {date, timezone, ...otherProps} = props;
    const {locale} = useIntl();
    const when = new Date(date);

    if (isToday(when)) {
        return (
            <FormattedText
                {...otherProps}
                id='date_separator.today'
                defaultMessage='Today'
            />
        );
    } else if (isYesterday(when)) {
        return (
            <FormattedText
                {...otherProps}
                id='date_separator.yesterday'
                defaultMessage='Yesterday'
            />
        );
    }

    if (isSameYear(when, new Date())) {
        const formatted = formatDateWithoutYear(locale, when, timezone);
        if (formatted) {
            return <Text {...otherProps}>{formatted}</Text>;
        }
    }

    return (
        <FormattedDate
            {...otherProps}
            format={AFTER_YEAR_FORMAT}
            timezone={timezone}
            value={date}
        />
    );
};

const DateSeparator = (props: DateSeparatorProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={[styles.container, props.style as StyleProp<ViewStyle>]}>
            <View style={styles.line}/>
            <RecentDate
                {...props}
                style={styles.date}
            />
            <View style={styles.line}/>
        </View>
    );
};

export default React.memo(DateSeparator);
