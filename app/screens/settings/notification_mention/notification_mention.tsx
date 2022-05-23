// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useReducer} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import Section from '@components/section';
import SectionItem from '@components/section_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 12,
            height: 40,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
            marginLeft: 15,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        },
        scrollViewContent: {
            paddingVertical: 35,
        },
    };
});

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

type NotificationMentionProps = {
    isCRTEnabled?: boolean;
    currentUser?: UserModel;
    mentionKeys: string;
}
const NotificationMention = ({currentUser, mentionKeys}: NotificationMentionProps) => {
    const [{firstName, usernameMention, channel}, dispatch] = useReducer(reducer, INITIAL_STATE);
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const renderMentionSection = () => {
        let mentionKeysComponent;
        if (mentionKeys) {
            mentionKeysComponent = (<Text>{mentionKeys}</Text>);
        } else {
            mentionKeysComponent = (
                <FormattedText
                    id='mobile.notification_settings_mentions.keywordsDescription'
                    defaultMessage='Other words that trigger a mention'
                />
            );
        }

        return (
            <Section
                headerId={t('mobile.notification_settings_mentions.wordsTrigger')}
                headerDefaultMessage='WORDS THAT TRIGGER MENTIONS'
            >
                <>
                    { Boolean(currentUser?.firstName) && (
                        <>
                            <SectionItem
                                label={(
                                    <Text>
                                        {currentUser!.firstName}
                                    </Text>
                                )}
                                description={(
                                    <FormattedText
                                        id='mobile.notification_settings.mentions.sensitiveName'
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
                        <SectionItem
                            label={(
                                <Text>
                                    {currentUser!.username}
                                </Text>
                            )}
                            description={(
                                <FormattedText
                                    id='mobile.notification_settings.mentions.sensitiveUsername'
                                    defaultMessage='Your non-case sensitive username'
                                />
                            )}
                            selected={usernameMention}
                            action={toggleUsernameMention}
                            actionType='toggle'
                        />
                    )}
                    <View style={styles.separator}/>
                    <SectionItem
                        label={(
                            <Text>
                                {'@channel, @all, @here'}
                            </Text>
                        )}
                        description={(
                            <FormattedText
                                id='mobile.notification_settings.mentions.channelWide'
                                defaultMessage='Channel-wide mentions'
                            />
                        )}
                        action={toggleChannelMentions}
                        actionType='toggle'
                        selected={channel}
                    />
                    <View style={styles.separator}/>
                    <SectionItem
                        label={(
                            <FormattedText
                                id='mobile.notification_settings_mentions.keywords'
                                defaultMessage='Keywords'
                            />
                        )}
                        description={mentionKeysComponent}
                        action={goToNotificationSettingsMentionKeywords}
                        actionType='arrow'
                    />
                </>
            </Section>
        );
    };

    const goToNotificationSettingsMentionKeywords = () => {
        return Alert.alert(
            'The functionality you are trying to use has not yet been implemented.',
        );
    };
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

    return (
        <SafeAreaView
            edges={['left', 'right']}
            testID='notification_settings.screen'
            style={styles.container}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                alwaysBounceVertical={false}
            >
                {renderMentionSection()}
                {/*{!isCollapsedThreadsEnabled && (*/}
                {/*    renderReplySection(styles)*/}
                {/*)}*/}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationMention;

