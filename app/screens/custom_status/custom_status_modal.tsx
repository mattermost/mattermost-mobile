// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import {View, Text} from 'react-native';

// @ts-ignore
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scrollview';
import {SafeAreaView} from 'react-native-safe-area-context';
import StatusBar from '@components/status_bar';
import {t} from '@utils/i18n';
import {UserCustomStatus} from '@mm-redux/types/users';
import Emoji from '@components/emoji';
import CompassIcon from '@components/compass_icon';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {Theme} from '@mm-redux/types/preferences';
import {TextInput} from 'react-native-gesture-handler';
import {CustomStatus} from '@constants';
import CustomStatusSuggestion from '@screens/custom_status/custom_status_suggestion';
import {setButtons, dismissModal} from '@actions/navigation';

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

type Props = {
    componentId: string;
    theme: Theme;
    customStatus: UserCustomStatus;
    recentCustomStatuses: UserCustomStatus[];
    actions: {
        setCustomStatus: (customStatus: UserCustomStatus) => void;
        unsetCustomStatus : () => void;
        removeRecentCustomStatus: (customStatus: UserCustomStatus) => void;
    };
}

type State = {
    emoji: string;
    text: string;
}

export default class CustomStatusModal extends PureComponent<Props, State> {
    static options() {
        return {
            topBar: {
                title: {
                    text: 'Set a Status',
                    alignment: 'center',
                },
            },
        };
    }

    rightButton = {
        id: 'update-custom-status',
        enabled: true,
        showAsAction: 'always',
        text: 'Done',
    };

    constructor(props: Props) {
        super(props);

        const buttons = {
            rightButtons: [this.rightButton],
        };

        this.rightButton.color = props.theme.sidebarHeaderTextColor;

        setButtons(props.componentId, buttons);

        this.state = {
            emoji: props.customStatus.emoji,
            text: props.customStatus.text || '',
        };
    }

    navigationButtonPressed() {
        this.handleSetStatus();
    }

    handleSetStatus = () => {
        const {emoji, text} = this.state;
        const customStatus = {
            emoji: emoji || 'speech_balloon',
            text: text.trim(),
        };
        this.props.actions.setCustomStatus(customStatus);
        dismissModal();
    };

    handleTextChange = (value: string) => this.setState({text: value});

    handleRecentCustomStatusClear = (status: UserCustomStatus) => this.props.actions.removeRecentCustomStatus(status);

    clearHandle = () => {
        this.setState({emoji: '', text: ''});
    };

    handleSuggestionClick = (status: UserCustomStatus) => {
        const {emoji, text} = status;
        this.setState({emoji, text});
    };

    renderRecentCustomStatuses = () => {
        const {recentCustomStatuses, theme} = this.props;
        const style = getStyleSheet(theme);
        const recentStatuses = recentCustomStatuses.map((status: UserCustomStatus, index: number) => (
            <CustomStatusSuggestion
                key={status.text}
                handleSuggestionClick={this.handleSuggestionClick}
                handleClear={this.handleRecentCustomStatusClear}
                emoji={status.emoji}
                text={status.text}
                theme={theme}
                separator={index !== recentCustomStatuses.length - 1}
            />
        ));

        if (recentStatuses.length <= 0) {
            return null;
        }

        return (
            <>
                <View style={style.separator}/>
                <View >
                    <Text style={style.title}>{'RECENT'}</Text>
                    <View style={style.block}>
                        {recentStatuses}
                    </View>
                </View >
            </>
        );
    };

    renderCustomStatusSuggestions = () => {
        const {recentCustomStatuses, theme} = this.props;
        const style = getStyleSheet(theme);
        const recentCustomStatusTexts = recentCustomStatuses.map((status: UserCustomStatus) => status.text);
        const customStatusSuggestions = defaultCustomStatusSuggestions.
            map((status) => ({
                emoji: status.emoji,
                text: status.messageDefault,
            })).
            filter((status: UserCustomStatus) => !recentCustomStatusTexts.includes(status.text)).
            map((status: UserCustomStatus, index: number, arr: UserCustomStatus[]) => (
                <CustomStatusSuggestion
                    key={index}
                    handleSuggestionClick={this.handleSuggestionClick}
                    emoji={status.emoji}
                    text={status.text}
                    theme={theme}
                    separator={index !== arr.length - 1}
                />
            ));

        if (customStatusSuggestions.length <= 0) {
            return null;
        }

        return (
            <>
                <View style={style.separator}/>
                <View>
                    <Text style={style.title}>{'SUGGESTIONS'}</Text>
                    <View style={style.block}>
                        {customStatusSuggestions}
                    </View>
                </View>
            </>
        );
    };

    render() {
        const {emoji, text} = this.state;
        const {theme} = this.props;

        const style = getStyleSheet(theme);
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

        const customStatusInput = (
            <View style={style.inputContainer}>
                {customStatusEmoji}
                <TextInput
                    value={text}
                    placeholder='Set a Status'
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={this.handleTextChange}
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
                <KeyboardAwareScrollView
                    bounces={false}
                >
                    <View style={style.scrollView}>
                        {customStatusInput}
                        {this.renderRecentCustomStatuses()}
                        {this.renderCustomStatusSuggestions()}
                    </View>
                </KeyboardAwareScrollView>
            </SafeAreaView>
        );
    }
}

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
            marginLeft: 16,
        },
    };
});
