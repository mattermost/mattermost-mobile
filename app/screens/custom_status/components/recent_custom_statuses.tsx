// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {t} from '@i18n';
import CustomStatusSuggestion from '@screens/custom_status/components/custom_status_suggestion';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    onHandleClear: (status: UserCustomStatus) => void;
    onHandleSuggestionClick: (status: UserCustomStatus) => void;
    recentCustomStatuses: UserCustomStatus[];
    theme: Theme;
}

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

const RecentCustomStatuses = ({onHandleClear, onHandleSuggestionClick, recentCustomStatuses, theme}: Props) => {
    const style = getStyleSheet(theme);

    if (recentCustomStatuses.length === 0) {
        return null;
    }

    return (
        <>
            <View style={style.separator}/>
            <View testID='custom_status.recents'>
                <FormattedText
                    id={t('custom_status.suggestions.recent_title')}
                    defaultMessage='Recent'
                    style={style.title}
                />
                <View style={style.block}>
                    {recentCustomStatuses.map((status: UserCustomStatus, index: number) => (
                        <CustomStatusSuggestion
                            key={`${status.text}-${index.toString()}`}
                            handleSuggestionClick={onHandleSuggestionClick}
                            handleClear={onHandleClear}
                            emoji={status?.emoji}
                            text={status?.text}
                            theme={theme}
                            separator={index !== recentCustomStatuses.length - 1}
                            duration={status.duration}
                            expires_at={status.expires_at}
                        />
                    ))}
                </View>
            </View >
        </>
    );
};

export default RecentCustomStatuses;
