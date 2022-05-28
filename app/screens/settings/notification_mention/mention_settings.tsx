// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useReducer} from 'react';
import {Alert, Text, View} from 'react-native';

import Block from '@components/block';
import BlockItem from '@components/block_item';
import FormattedText from '@components/formatted_text';
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
            marginLeft: 15,
        },
        area: {
            paddingHorizontal: 16,
        },
        upperCase: {
            textTransform: 'uppercase',
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 400, 'Regular'),
            fontSize: 16,
            lineHeight: 24,
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

    let mentionKeysComponent;
    if (mentionKeys) {
        mentionKeysComponent = (<Text>{mentionKeys}</Text>);
    } else {
        mentionKeysComponent = (
            <FormattedText
                id='notification_settings.mentions.keywordsDescription'
                defaultMessage='Other words that trigger a mention'
            />
        );
    }

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
            containerStyles={styles.area}
        >
            { Boolean(currentUser?.firstName) && (
                <>
                    <BlockItem
                        label={(
                            <Text style={styles.label}>
                                {currentUser!.firstName}
                            </Text>
                        )}
                        description={(
                            <FormattedText
                                id='notification_settings.mentions.sensitiveName'
                                defaultMessage='Your case sensitive first name'
                            />
                        )}
                        action={toggleFirstNameMention}
                        actionType='toggle'
                        selected={firstName}
                    />
                    <View style={styles.separator}/>
                </>
            )
            }
            {Boolean(currentUser?.username) && (
                <BlockItem
                    label={(
                        <Text style={styles.label}>
                            {currentUser!.username}
                        </Text>
                    )}
                    description={(
                        <FormattedText
                            id='notification_settings.mentions.sensitiveUsername'
                            defaultMessage='Your non-case sensitive username'
                        />
                    )}
                    selected={usernameMention}
                    action={toggleUsernameMention}
                    actionType='toggle'
                />
            )}
            <View style={styles.separator}/>
            <BlockItem
                label={(
                    <Text style={styles.label}>
                        {'@channel, @all, @here'}
                    </Text>
                )}
                description={(
                    <FormattedText
                        id='notification_settings.mentions.channelWide'
                        defaultMessage='Channel-wide mentions'
                    />
                )}
                action={toggleChannelMentions}
                actionType='toggle'
                selected={channel}
            />
            <View style={styles.separator}/>
            <BlockItem
                label={(
                    <FormattedText
                        id='notification_settings.mentions.keywords'
                        defaultMessage='Keywords'
                        style={styles.label}
                    />
                )}
                description={mentionKeysComponent}
                action={goToNotificationSettingsMentionKeywords}
                actionType='arrow'
            />
        </Block>
    );
};

export default MentionSettings;
