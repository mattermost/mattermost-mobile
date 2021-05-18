// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';
import CustomStatusText from '@components/custom_status/custom_status_text';
import {Theme} from '@mm-redux/types/preferences';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import React, {useCallback, useState} from 'react';
import {View, TouchableOpacity} from 'react-native';
import {preventDoubleTap} from '@utils/tap';
import DateTimePicker from './date_time_selector';
import {CustomStatusDuration} from '@mm-redux/types/users';
import CompassIcon from '@components/compass_icon';
import {Moment} from 'moment';
import {durationValues} from '@constants/custom_status';

type Props = {
    handleSuggestionClick: (duration: CustomStatusDuration, expiresAt: string) => void;
    duration: CustomStatusDuration;
    theme: Theme;
    separator: boolean;
    isSelected: boolean;
    intl: typeof intlShape;
};

type ExpiryMenuItem = {
    text: string;
    value: string;
}

const {
    DONT_CLEAR,
    THIRTY_MINUTES,
    ONE_HOUR,
    FOUR_HOURS,
    TODAY,
    THIS_WEEK,
    DATE_AND_TIME,
} = CustomStatusDuration;

const ClearAfterSuggestion = (props: Props) => {
    const {handleSuggestionClick, duration, theme, separator, isSelected, intl} = props;
    const style = getStyleSheet(theme);

    const divider = separator ? <View style={style.divider}/> : null;
    const [showDateAndTimePicker, setShowDateAndTimePicker] = useState(false);

    const expiryMenuItems: { [key in CustomStatusDuration]: ExpiryMenuItem; } = {
        [DONT_CLEAR]: {
            text: intl.formatMessage(durationValues[DONT_CLEAR]),
            value: intl.formatMessage(durationValues[DONT_CLEAR]),
        },
        [THIRTY_MINUTES]: {
            text: intl.formatMessage(durationValues[THIRTY_MINUTES]),
            value: intl.formatMessage(durationValues[THIRTY_MINUTES]),
        },
        [ONE_HOUR]: {
            text: intl.formatMessage(durationValues[ONE_HOUR]),
            value: intl.formatMessage(durationValues[ONE_HOUR]),
        },
        [FOUR_HOURS]: {
            text: intl.formatMessage(durationValues[FOUR_HOURS]),
            value: intl.formatMessage(durationValues[FOUR_HOURS]),
        },
        [TODAY]: {
            text: intl.formatMessage(durationValues[TODAY]),
            value: intl.formatMessage(durationValues[TODAY]),
        },
        [THIS_WEEK]: {
            text: intl.formatMessage(durationValues[THIS_WEEK]),
            value: intl.formatMessage(durationValues[THIS_WEEK]),
        },
        [DATE_AND_TIME]: {
            text: intl.formatMessage({id: 'expiry_dropdown.custom', defaultMessage: 'Custom'}),
            value: intl.formatMessage(durationValues[DATE_AND_TIME]),
        },
    };

    const handleClick = useCallback(
        preventDoubleTap(() => {
            if (duration === CustomStatusDuration.DATE_AND_TIME) {
                setShowDateAndTimePicker(true);
            } else {
                handleSuggestionClick(duration, '');
            }
        }),
        [handleSuggestionClick, duration],
    );

    const handleCustomExpiresAtChange = (expiresAt: Moment) => {
        const expiry = expiresAt.toISOString();
        handleSuggestionClick(duration, expiry);
    };

    const renderDateTimePicker = showDateAndTimePicker && (
        <DateTimePicker
            theme={theme}
            handleChange={handleCustomExpiresAtChange}
        />
    );

    const renderCheckIcon = isSelected && (
        <View style={style.selectButton}>
            <CompassIcon
                name={'check'}
                size={24}
                style={style.button}
            />
        </View>
    );

    return (
        <View>
            <TouchableOpacity
                testID={`expiry_time_suggestion.${duration}`}
                onPress={handleClick}
            >
                <View style={style.container}>
                    <View style={style.textContainer}>
                        <CustomStatusText
                            text={expiryMenuItems[duration].text}
                            theme={theme}
                            textStyle={{color: theme.centerChannelColor}}
                        />
                        {renderCheckIcon}
                    </View>
                </View>
                {divider}
            </TouchableOpacity>
            {renderDateTimePicker}
        </View>
    );
};

export default ClearAfterSuggestion;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            display: 'flex',
            flexDirection: 'row',
            padding: 10,
        },
        textContainer: {
            marginLeft: 5,
            marginBottom: 2,
            alignItems: 'center',
            width: '70%',
            flex: 1,
            flexDirection: 'row',
            position: 'relative',
        },
        selectButton: {
            position: 'absolute',
            top: 3,
            right: 14,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
            marginHorizontal: 16,
        },
        button: {
            borderRadius: 1000,
            color: theme.buttonBg,
        },
    };
});
