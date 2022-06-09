// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Block from '@components/block';
import FloatingTextInput from '@components/floating_text_input_label';
import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {popTopScreen, setButtons} from '@screens/navigation';
import UserModel from '@typings/database/models/servers/user';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getNotificationProps} from '@utils/user';

const mentionHeaderText = {
    id: t('notification_settings.mentions.wordsTrigger'),
    defaultMessage: 'Words that trigger mentions',
};

const SAVE_MENTION_BUTTON_ID = 'SAVE_MENTION_BUTTON_ID';

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
        input: {
            color: theme.centerChannelColor,
            height: 150,
            paddingHorizontal: 15,
            ...typography('Body', 100, 'Regular'),
        },
        containerStyle: {
            marginTop: 30,
        },
    };
});

const getMentionKeys = (currentUser: UserModel) => {
    const notifyProps = getNotificationProps(currentUser);
    const mKeys = (notifyProps.mention_keys || '').split(',');

    const usernameMentionIndex = mKeys.indexOf(currentUser.username);
    if (usernameMentionIndex > -1) {
        mKeys.splice(usernameMentionIndex, 1);
    }

    return {
        mentionKeys: mKeys.join(','),
        usernameMention: usernameMentionIndex > -1,
    };
};

type MentionSectionProps = {
    componentId: string;
    currentUser: UserModel;
}
const MentionSettings = ({componentId, currentUser}: MentionSectionProps) => {
    const mnKeyInitialValue = useMemo(() => getMentionKeys(currentUser), [currentUser]);
    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);

    const [tglFirstName, setTglFirstName] = useState(Boolean(notifyProps.first_name));
    const [tglUserName, setTglUserName] = useState(mnKeyInitialValue.usernameMention);
    const [tglChannel, setTglChannel] = useState(Boolean(notifyProps.channel));

    const [mentionKeys, setMentionKeys] = useState(() => getMentionKeys(currentUser).mentionKeys);
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const saveButton = useMemo(() => {
        return {
            id: SAVE_MENTION_BUTTON_ID,
            enabled: false,
            showAsAction: 'always' as const,
            testID: 'notification_settings.mentions.save.button',
            color: theme.sidebarHeaderTextColor,
            text: intl.formatMessage({id: 'settings.save', defaultMessage: 'Save'}),
        };
    }, [theme.sidebarHeaderTextColor]);

    const canSave = useCallback(() => {
        const fNameUnChanged = tglFirstName !== Boolean(notifyProps.first_name);
        const usnUnChanged = tglUserName !== mnKeyInitialValue.usernameMention;
        const channelUnChanged = tglChannel !== Boolean(notifyProps.channel);
        const kwsUnChanged = mnKeyInitialValue.mentionKeys !== mentionKeys;

        const enabled = fNameUnChanged || usnUnChanged || channelUnChanged || kwsUnChanged;

        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled,
            }],
        };
        setButtons(componentId, buttons);
    }, [componentId, saveButton, tglFirstName, tglChannel, tglUserName, mentionKeys, notifyProps]);

    const onChangeText = useCallback((text: string) => {
        setMentionKeys(text);
        canSave();
    }, [canSave]);

    const close = useCallback(() => popTopScreen(componentId), [componentId]);

    const saveMention = useCallback(() => {
        //todo: complete this method !!!
        close();
    }, [mentionKeys, close]);

    const onToggleFirstName = useCallback(() => {
        setTglFirstName((prev) => !prev);
    }, []);

    const onToggleUserName = useCallback(() => {
        setTglUserName((prev) => !prev);
    }, []);

    const onToggleChannel = useCallback(() => {
        setTglChannel((prev) => !prev);
    }, []);

    useEffect(() => {
        canSave();
    }, [tglFirstName, tglUserName, tglChannel, mentionKeys]);

    useNavButtonPressed(SAVE_MENTION_BUTTON_ID, componentId, () => saveMention(), [mentionKeys]);

    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        setButtons(componentId, {
            rightButtons: [saveButton],
        });
    }, []);

    return (
        <Block
            headerText={mentionHeaderText}
            headerStyles={styles.upperCase}
        >
            { Boolean(currentUser?.firstName) && (
                <>
                    <OptionItem
                        action={onToggleFirstName}
                        containerStyle={styles.container}
                        description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveName', defaultMessage: 'Your case sensitive first name'})}
                        label={currentUser.firstName}
                        selected={tglFirstName}
                        type='toggle'
                    />
                    <View style={styles.separator}/>
                </>
            )
            }
            {Boolean(currentUser?.username) && (
                <OptionItem
                    action={onToggleUserName}
                    containerStyle={styles.container}
                    description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveUsername', defaultMessage: 'Your non-case sensitive username'})}
                    label={currentUser.username}
                    selected={tglUserName}
                    type='toggle'
                />
            )}
            <View style={styles.separator}/>
            <OptionItem
                action={onToggleChannel}
                containerStyle={styles.container}
                description={intl.formatMessage({id: 'notification_settings.mentions.channelWide', defaultMessage: 'Channel-wide mentions'})}
                label='@channel, @all, @here'
                selected={tglChannel}
                type='toggle'
            />
            <View style={styles.separator}/>
            <FloatingTextInput
                allowFontScaling={true}
                autoCapitalize='none'
                autoCorrect={false}
                blurOnSubmit={true}
                containerStyle={styles.containerStyle}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                label={intl.formatMessage({id: 'notification_settings.mentions.keywords', defaultMessage: 'Keywords'})}
                multiline={true}
                onChangeText={onChangeText}
                placeholder={intl.formatMessage({id: 'notification_settings.mentions..keywordsDescription', defaultMessage: 'Other words that trigger a mention'})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                returnKeyType='done'
                textInputStyle={styles.input}
                textAlignVertical='top'
                theme={theme}
                underlineColorAndroid='transparent'
                value={mentionKeys}
            />
        </Block>
    );
};

export default MentionSettings;
