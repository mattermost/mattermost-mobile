// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import CustomStatusText from '@components/custom_status/custom_status_text';
import {Theme} from '@mm-redux/types/preferences';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import React, {useCallback, useState} from 'react';
import {View, TouchableOpacity} from 'react-native';
import {preventDoubleTap} from '@utils/tap';
import DateTimePicker from './date_time_selector';
import {CustomStatusDuration, ExpiryMenuItems} from '@mm-redux/types/users';
import CompassIcon from '@components/compass_icon';

type Props = {
    handleSuggestionClick: (duration: CustomStatusDuration, expiresAt: string) => void;
    duration: CustomStatusDuration;
    theme: Theme;
    separator: boolean;
    isSelected: boolean;
};

const ClearAfterSuggestion = (props: Props) => {
    const {handleSuggestionClick, duration, theme, separator, isSelected} = props;
    const style = getStyleSheet(theme);

    const divider = separator ? <View style={style.divider}/> : null;
    const [showDateAndTimePicker, setShowDateAndTimePicker] = useState(false);
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

    const handleCustomExpiresAtChange = (expiresAt: Date) => {
        const expiry = expiresAt.toISOString();
        handleSuggestionClick(duration, expiry);
    };

    return (
        <View>
            <TouchableOpacity
                testID={`expiry_time_suggestion.${duration}`}
                onPress={handleClick}
            >
                <View style={style.container}>
                    <View style={style.textContainer}>
                        <CustomStatusText
                            text={ExpiryMenuItems[duration].text}
                            theme={theme}
                            textStyle={{color: theme.centerChannelColor}}
                        />
                        {isSelected && <View style={style.selectButton}>
                            <CompassIcon
                                name={'check'}
                                size={24}
                                style={style.button}
                            />
                        </View>}
                    </View>
                </View>
                {divider}
            </TouchableOpacity>
            {showDateAndTimePicker && <DateTimePicker handleChange={handleCustomExpiresAtChange}/>}
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
            color: theme.sidebarHeaderBg,
        },
    };
});
