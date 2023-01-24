// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CustomStatusSuggestion from './custom_status_suggestion';

import type {IntlShape} from 'react-intl';

type Props = {
    intl: IntlShape;
    onHandleCustomStatusSuggestionClick: (status: UserCustomStatus) => void;
    recentCustomStatuses: UserCustomStatus[];
    theme: Theme;
};

type DefaultUserCustomStatus = {
    emoji: string;
    message: string;
    messageDefault: string;
    durationDefault: CustomStatusDuration;
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
            textTransform: 'uppercase',
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
    };
});

const defaultCustomStatusSuggestions: DefaultUserCustomStatus[] = [
    {emoji: 'calendar', message: t('custom_status.suggestions.in_a_meeting'), messageDefault: 'In a meeting', durationDefault: 'one_hour'},
    {emoji: 'hamburger', message: t('custom_status.suggestions.out_for_lunch'), messageDefault: 'Out for lunch', durationDefault: 'thirty_minutes'},
    {emoji: 'sneezing_face', message: t('custom_status.suggestions.out_sick'), messageDefault: 'Out sick', durationDefault: 'today'},
    {emoji: 'house', message: t('custom_status.suggestions.working_from_home'), messageDefault: 'Working from home', durationDefault: 'today'},
    {emoji: 'palm_tree', message: t('custom_status.suggestions.on_a_vacation'), messageDefault: 'On a vacation', durationDefault: 'this_week'},
];

const CustomStatusSuggestions = ({
    intl,
    onHandleCustomStatusSuggestionClick,
    recentCustomStatuses,
    theme,
}: Props) => {
    const style = getStyleSheet(theme);
    const recentCustomStatusTexts = new Set(recentCustomStatuses.map((status: UserCustomStatus) => status.text));

    const customStatusSuggestions = defaultCustomStatusSuggestions.
        map((status) => ({
            emoji: status.emoji,
            text: intl.formatMessage({id: status.message, defaultMessage: status.messageDefault}),
            duration: status.durationDefault,
        })).
        filter((status) => !recentCustomStatusTexts.has(status.text)).
        map((status, index, arr) => (
            <CustomStatusSuggestion
                key={status.text}
                handleSuggestionClick={onHandleCustomStatusSuggestionClick}
                emoji={status.emoji}
                text={status.text}
                theme={theme}
                separator={index !== arr.length - 1}
                duration={status.duration}
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
                    id={t('custom_status.suggestions.title')}
                    defaultMessage='Suggestions'
                    style={style.title}
                />
                <View style={style.block}>{customStatusSuggestions}</View>
            </View>
        </>
    );
};

export default CustomStatusSuggestions;
