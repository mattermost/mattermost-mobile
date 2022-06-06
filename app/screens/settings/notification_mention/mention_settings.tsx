// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useReducer} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View} from 'react-native';

import Block from '@components/block';
import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import UserModel from '@typings/database/models/servers/user';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const UPDATE_MENTION_PREF = 'UPDATE_MENTION_PREF';
const INITIAL_STATE = {
    firstName: false,
    usernameMention: false,
    channel: false,
};
type Action = {
    type: string;
    data: Partial<typeof INITIAL_STATE>;
}
const reducer = (state: typeof INITIAL_STATE, action: Action) => {
    switch (action.type) {
        case UPDATE_MENTION_PREF:
            return {
                ...state,
                ...action.data,
            };

        default:
            return state;
    }
};

const mentionHeaderText = {
    id: t('notification_settings.mentions.wordsTrigger'),
    defaultMessage: 'Words that trigger mentions',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
        },
        upperCase: {
            textTransform: 'uppercase',
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        desc: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
            paddingLeft: 8,
        },
        container: {
            paddingHorizontal: 8,
        },
    };
});

type MentionSectionProps = {
    currentUser?: UserModel;
    mentionKeys: string;
}
const MentionSettings = ({currentUser, mentionKeys}: MentionSectionProps) => {
    const [{firstName, usernameMention, channel}, dispatch] = useReducer(reducer, INITIAL_STATE);
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const toggleChannelMentions = () => {
        dispatch({
            type: UPDATE_MENTION_PREF,
            data: {
                channel: !channel,
            },
        });
    };
    const toggleUsernameMention = () => {
        dispatch({
            type: UPDATE_MENTION_PREF,
            data: {
                usernameMention: !usernameMention,
            },
        });
    };
    const toggleFirstNameMention = () => {
        dispatch({
            type: UPDATE_MENTION_PREF,
            data: {
                firstName: !firstName,
            },
        });
    };
    const goToNotificationSettingsMentionKeywords = () => {
        return Alert.alert(
            'The functionality you are trying to use has not yet been implemented.',
        );
    };

    return (
        <Block
            headerText={mentionHeaderText}
            headerStyles={styles.upperCase}
        >
            { Boolean(currentUser?.firstName) && (
                <>
                    <OptionItem
                        action={toggleFirstNameMention}
                        containerStyle={styles.container}
                        description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveName', defaultMessage: 'Your case sensitive first name'})}
                        label={currentUser!.firstName}
                        selected={firstName}
                        type='toggle'
                    />
                    <View style={styles.separator}/>
                </>
            )
            }
            {Boolean(currentUser?.username) && (
                <OptionItem
                    action={toggleUsernameMention}
                    containerStyle={styles.container}
                    description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveUsername', defaultMessage: 'Your non-case sensitive username'})}
                    label={currentUser!.username}
                    selected={usernameMention}
                    type='toggle'
                />
            )}
            <View style={styles.separator}/>
            <OptionItem
                action={toggleChannelMentions}
                containerStyle={styles.container}
                description={intl.formatMessage({id: 'notification_settings.mentions.channelWide', defaultMessage: 'Channel-wide mentions'})}
                label='@channel, @all, @here'
                selected={channel}
                type='toggle'
            />
            <View style={styles.separator}/>
            <OptionItem
                action={goToNotificationSettingsMentionKeywords}
                containerStyle={styles.container}
                description={mentionKeys || intl.formatMessage({id: 'notification_settings.mentions.keywordsDescription', defaultMessage: 'Other words that trigger a mention'})}
                label={intl.formatMessage({id: 'notification_settings.mentions.keywords', defaultMessage: 'Keywords'})}
                type='arrow'
            />
        </Block>
    );
};

export default MentionSettings;
