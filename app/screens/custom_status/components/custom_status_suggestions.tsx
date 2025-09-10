// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, type IntlShape, type MessageDescriptor} from 'react-intl';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CustomStatusSuggestion from './custom_status_suggestion';

type Props = {
    intl: IntlShape;
    onHandleCustomStatusSuggestionClick: (status: UserCustomStatus) => void;
    recentCustomStatuses: UserCustomStatus[];
    theme: Theme;
};

type DefaultUserCustomStatus = {
    emoji: string;
    message: MessageDescriptor;
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

const messages = defineMessages({
    inAMeeting: {
        id: 'custom_status.suggestions.in_a_meeting',
        defaultMessage: 'In a meeting',
    },
    outForLunch: {
        id: 'custom_status.suggestions.out_for_lunch',
        defaultMessage: 'Out for lunch',
    },
    outSick: {
        id: 'custom_status.suggestions.out_sick',
        defaultMessage: 'Out sick',
    },
    workingFromHome: {
        id: 'custom_status.suggestions.working_from_home',
        defaultMessage: 'Working from home',
    },
    onAVacation: {
        id: 'custom_status.suggestions.on_a_vacation',
        defaultMessage: 'On a vacation',
    },
});

const defaultCustomStatusSuggestions: DefaultUserCustomStatus[] = [
    {emoji: 'calendar', message: messages.inAMeeting, durationDefault: 'one_hour'},
    {emoji: 'hamburger', message: messages.outForLunch, durationDefault: 'thirty_minutes'},
    {emoji: 'sneezing_face', message: messages.outSick, durationDefault: 'today'},
    {emoji: 'house', message: messages.workingFromHome, durationDefault: 'today'},
    {emoji: 'palm_tree', message: messages.onAVacation, durationDefault: 'this_week'},
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
            text: intl.formatMessage(status.message),
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
                    id={'custom_status.suggestions.title'}
                    defaultMessage='Suggestions'
                    style={style.title}
                />
                <View style={style.block}>{customStatusSuggestions}</View>
            </View>
        </>
    );
};

export default CustomStatusSuggestions;
