// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react';
import {View, Text} from 'react-native';
import {NavigationComponentProps, NavigationFunctionComponent} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';
import StatusBar from '@components/status_bar';
import {t} from '@utils/i18n';
import {makeGetCustomStatus, getRecentCustomStatuses} from '@selectors/custom_status';
import {useDispatch, useSelector} from 'react-redux';
import {GlobalState} from '@mm-redux/types/store';
import {setCustomStatus, unsetCustomStatus, removeRecentCustomStatus} from '@actions/views/custom_status';
import {UserCustomStatus} from '@mm-redux/types/users';
import Emoji from '@components/emoji';
import CompassIcon from '@components/compass_icon';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {Theme} from '@mm-redux/types/preferences';
import {TextInput} from 'react-native-gesture-handler';
import {CustomStatus} from '@constants';
import CustomStatusSuggestion from '@screens/custom_status/custom_status_suggestion';
import {setButtons} from '@actions/navigation';

type DefaultUserCustomStatus = {
    emoji: string;
    message: string;
    messageDefault: string;
};

const defaultCustomStatusSuggestions: DefaultUserCustomStatus[] = [
    {emoji: 'calendar', message: t('custom_status.suggestions.in_a_meeting'), messageDefault: 'In a meeting'},
    {emoji: 'hamburger', message: t('custom_status.suggestions.out_for_lunch'), messageDefault: 'Out for lunch'},
    {emoji: 'sneezing_face', message: t('custom_status.suggestions.out_sick'), messageDefault: 'Out sick'},
    {emoji: 'house', message: t('custom_status.suggestions.working_from_home'), messageDefault: 'Working from home'},
    {emoji: 'palm_tree', message: t('custom_status.suggestions.on_a_vacation'), messageDefault: 'On a vacation'},
];

const CustomStatusModal: NavigationFunctionComponent = (props: NavigationComponentProps) => {
    const getCustomStatus = makeGetCustomStatus();
    const dispatch = useDispatch();
    const currentCustomStatus = useSelector((state: GlobalState) => getCustomStatus(state)) || {};
    const recentCustomStatuses = useSelector((state: GlobalState) => getRecentCustomStatuses(state));
    const theme = useSelector(getTheme);

    const [text, setText] = useState<string>(currentCustomStatus.text || '');
    const [emoji, setEmoji] = useState<string>(currentCustomStatus.emoji);
    const isStatusSet = emoji || text;
    const isCurrentCustomStatusSet = currentCustomStatus.text || currentCustomStatus.emoji;
    const style = getStyleSheet(theme);

    const rightButton = {
        id: 'update-custom-status',
        enabled: true,
        showAsAction: 'always',
        color: theme.sidebarHeaderTextColor,
        text: 'Done',
    };

    const buttons = {
        leftButtons: [],
        rightButtons: [rightButton],
    };
    setButtons(props.componentId, buttons);

    const handleSetStatus = () => {
        const customStatus = {
            emoji: emoji || 'speech_balloon',
            text: text.trim(),
        };
        dispatch(setCustomStatus(customStatus));
    };

    const handleTextChange = (value: string) => setText(value);

    const handleRecentCustomStatusClear = (status: UserCustomStatus) => dispatch(removeRecentCustomStatus(status));

    const customStatusEmoji = emoji || text ?
        (
            <View style={style.emoji}>
                <Emoji
                    emojiName={emoji || 'speech_balloon'}
                    size={24}
                />
            </View>
        ) :
        (
            <CompassIcon
                name='emoticon-happy-outline'
                size={24}
                style={style.icon}
            />
        );

    const clearHandle = () => {
        setText('');
        setEmoji('');
    };

    const handleSuggestionClick = (status: UserCustomStatus) => {
        setEmoji(status.emoji);
        setText(status.text);
    };

    const renderCustomStatusSuggestions = () => {
        const recentCustomStatusTexts = recentCustomStatuses.map((status: UserCustomStatus) => status.text);
        const customStatusSuggestions = defaultCustomStatusSuggestions.
            map((status) => ({
                emoji: status.emoji,
                text: status.messageDefault,
            })).
            filter((status: UserCustomStatus) => !recentCustomStatusTexts.includes(status.text)).
            map((status: UserCustomStatus, index: number) => (
                <CustomStatusSuggestion
                    key={index}
                    handleSuggestionClick={handleSuggestionClick}
                    emoji={status.emoji}
                    text={status.text}
                    theme={theme}
                    separator={true}
                />
            ));

        if (customStatusSuggestions.length <= 0) {
            return null;
        }

        return (
            <View>
                <Text style={style.title}>{'SUGGESTIONS'}</Text>
                <View style={style.block}>
                    {customStatusSuggestions}
                </View>
            </View>
        );
    };

    const customStatusInput = (
        <View style={style.inputContainer}>
            {customStatusEmoji}
            <TextInput
                value={text}
                placeholder='Set a Status'
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                onChangeText={handleTextChange}
                style={style.input}
                autoCapitalize='none'
                autoCorrect={false}
                maxLength={CustomStatus.CUSTOM_STATUS_TEXT_CHARACTER_LIMIT}
                underlineColorAndroid='transparent'
                disableFullscreenUI={true}
                multiline={false}
                keyboardType={'default'}
                secureTextEntry={false}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
            />
        </View>
    );

    return (
        <SafeAreaView
            testID='custom_status.screen'
            style={style.container}
        >
            <StatusBar/>
            <View style={style.scrollView}>
                {customStatusInput}
                <View style={style.separator}/>
                {renderCustomStatusSuggestions()}
            </View>
        </SafeAreaView>
    );
};

CustomStatusModal.options = {
    topBar: {
        title: {
            text: 'Set a Status',
            alignment: 'center',
        },
    },
};

export default CustomStatusModal;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const emojiStyle = {
        position: 'absolute',
        left: 14,
        top: 12,
    };

    return {
        container: {
            flex: 1,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            paddingTop: 32,
        },
        inputContainer: {
            position: 'relative',
            flexDirection: 'row',
            alignItems: 'center',
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 14,
            paddingHorizontal: 52,
            height: 48,
        },
        icon: {
            ...emojiStyle,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        emoji: {
            ...emojiStyle,
        },
        separator: {
            marginTop: 32,
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
        title: {
            fontSize: 17,
            marginBottom: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});
