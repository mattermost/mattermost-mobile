// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment, {type Moment} from 'moment';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import CustomStatusExpiry from '@components/custom_status/custom_status_expiry';
import CustomStatusText from '@components/custom_status/custom_status_text';
import DateTimePicker from '@components/data_time_selector';
import {CST, CustomStatusDurationEnum} from '@constants/custom_status';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getTimezone} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser?: UserModel;
    duration: CustomStatusDuration;
    expiryTime?: string;
    handleItemClick: (duration: CustomStatusDuration, expiresAt: string) => void;

    isSelected: boolean;
    separator: boolean;
    showDateTimePicker?: boolean;
    showExpiryTime?: boolean;

};

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
        rightPosition: {
            position: 'absolute',
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
        customStatusExpiry: {
            color: theme.linkColor,
        },
    };
});

const ClearAfterMenuItem = ({currentUser, duration, expiryTime = '', handleItemClick, isSelected, separator, showDateTimePicker = false, showExpiryTime = false}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const style = getStyleSheet(theme);

    const expiryMenuItems: { [key in CustomStatusDuration]: string } = {
        [CustomStatusDurationEnum.DONT_CLEAR]: intl.formatMessage(CST[CustomStatusDurationEnum.DONT_CLEAR]),
        [CustomStatusDurationEnum.THIRTY_MINUTES]: intl.formatMessage(CST[CustomStatusDurationEnum.THIRTY_MINUTES]),
        [CustomStatusDurationEnum.ONE_HOUR]: intl.formatMessage(CST[CustomStatusDurationEnum.ONE_HOUR]),
        [CustomStatusDurationEnum.FOUR_HOURS]: intl.formatMessage(CST[CustomStatusDurationEnum.FOUR_HOURS]),
        [CustomStatusDurationEnum.TODAY]: intl.formatMessage(CST[CustomStatusDurationEnum.TODAY]),
        [CustomStatusDurationEnum.THIS_WEEK]: intl.formatMessage(CST[CustomStatusDurationEnum.THIS_WEEK]),
        [CustomStatusDurationEnum.DATE_AND_TIME]: intl.formatMessage({id: 'custom_status.expiry_dropdown.custom', defaultMessage: 'Custom'}),
    };

    const handleClick = preventDoubleTap(() => {
        handleItemClick(duration, expiryTime);
    });

    const handleCustomExpiresAtChange = useCallback((expiresAt: Moment) => {
        handleItemClick(duration, expiresAt.toISOString());
    }, [handleItemClick, duration]);

    const clearAfterMenuItemTestId = `custom_status_clear_after.menu_item.${duration}`;

    return (
        <View>
            <TouchableOpacity
                onPress={handleClick}
                testID={clearAfterMenuItemTestId}
            >
                <View style={style.container}>
                    <View style={style.textContainer}>
                        <CustomStatusText
                            text={expiryMenuItems[duration]}
                            theme={theme}
                            textStyle={{color: theme.centerChannelColor}}
                            testID={`${clearAfterMenuItemTestId}.custom_status_text`}
                        />
                        {isSelected && (
                            <View style={style.rightPosition}>
                                <CompassIcon
                                    name={'check'}
                                    size={24}
                                    style={style.button}
                                />
                            </View>
                        )}
                        {showExpiryTime && expiryTime !== '' && (
                            <View style={style.rightPosition}>
                                <CustomStatusExpiry
                                    theme={theme}
                                    time={moment(expiryTime).toDate()}
                                    textStyles={style.customStatusExpiry}
                                    showTimeCompulsory={true}
                                    showToday={true}
                                    testID={`${clearAfterMenuItemTestId}.custom_status_expiry`}
                                />
                            </View>
                        )}
                    </View>
                </View>
                {separator && <View style={style.divider}/>}
            </TouchableOpacity>
            {showDateTimePicker && (
                <DateTimePicker
                    handleChange={handleCustomExpiresAtChange}
                    theme={theme}
                    timezone={getTimezone(currentUser?.timezone)}
                />
            )}
        </View>
    );
};

export default ClearAfterMenuItem;
