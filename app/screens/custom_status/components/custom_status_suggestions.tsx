// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {IntlShape} from 'react-intl';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {CustomStatusDuration} from '@constants';
import {t} from '@i18n';
import CustomStatusSuggestion from '@screens/custom_status/custom_status_suggestion';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    intl: IntlShape;
    isExpirySupported: boolean;
    onHandleCustomStatusSuggestionClick: (status: UserCustomStatus) => void;
    recentCustomStatuses: UserCustomStatus[];
    theme: Theme;
};

type DefaultUserCustomStatus = {
    emoji: string;
    message: string;
    messageDefault: string;
    durationDefault: string;
};

const defaultCustomStatusSuggestions: DefaultUserCustomStatus[] = [
    {emoji: 'calendar', message: t('custom_status.suggestions.in_a_meeting'), messageDefault: 'In a meeting', durationDefault: CustomStatusDuration.ONE_HOUR.value},
    {emoji: 'hamburger', message: t('custom_status.suggestions.out_for_lunch'), messageDefault: 'Out for lunch', durationDefault: CustomStatusDuration.THIRTY_MINUTES.value},
    {emoji: 'sneezing_face', message: t('custom_status.suggestions.out_sick'), messageDefault: 'Out sick', durationDefault: CustomStatusDuration.TODAY.value},
    {emoji: 'house', message: t('custom_status.suggestions.working_from_home'), messageDefault: 'Working from home', durationDefault: CustomStatusDuration.TODAY.value},
    {emoji: 'palm_tree', message: t('custom_status.suggestions.on_a_vacation'), messageDefault: 'On a vacation', durationDefault: CustomStatusDuration.THIS_WEEK.value},
];

const CustomStatusSuggestions = ({
    intl,
    isExpirySupported,
    onHandleCustomStatusSuggestionClick,
    recentCustomStatuses,
    theme,
}: Props) => {
    const style = getStyleSheet(theme);

    const recentCustomStatusTexts = recentCustomStatuses.map((status: UserCustomStatus) => status.text);

    const customStatusSuggestions = defaultCustomStatusSuggestions.
        map((status) => ({
            emoji: status.emoji,
            text: intl.formatMessage({id: status.message, defaultMessage: status.messageDefault}),
            duration: status.durationDefault,
        })).
        filter((status: UserCustomStatus) => !recentCustomStatusTexts.includes(status.text)).
        map((status: UserCustomStatus, index: number, arr: UserCustomStatus[]) => (
            <CustomStatusSuggestion
                key={status.text}
                handleSuggestionClick={onHandleCustomStatusSuggestionClick} // this.handleCustomStatusSuggestionClick
                emoji={status.emoji}
                text={status.text}
                theme={theme}
                separator={index !== arr.length - 1}
                duration={status.duration}
                isExpirySupported={isExpirySupported}
            />
        ));

    if (customStatusSuggestions.length === 0) {
        return null;
    }

    return (
        <>
            <View style={style.separator}/>
            <View testID='custom_status.suggestions'>
                <FormattedText
                    id='custom_status.suggestions.title'
                    defaultMessage='SUGGESTIONS'
                    style={style.title}
                />
                <View style={style.block}>{customStatusSuggestions}</View>
            </View>
        </>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        separator: {
            marginTop: 32,
        },
        title: {
            fontSize: 17,
            marginBottom: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginLeft: 16,
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
    };
});

export default CustomStatusSuggestions;
