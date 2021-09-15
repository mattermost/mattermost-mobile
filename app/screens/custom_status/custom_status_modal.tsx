// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment, {Moment} from 'moment-timezone';
import React from 'react';
import {IntlShape, injectIntl} from 'react-intl';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleProp,
    ViewStyle,
    DeviceEventEmitter,
} from 'react-native';
import {Navigation, NavigationComponent, NavigationComponentProps, OptionsTopBarButton, Options, NavigationButtonPressedEvent} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {unsetCustomStatus} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import ClearButton from '@components/custom_status/clear_button';
import CustomStatusExpiry from '@components/custom_status/custom_status_expiry';
import FormattedText from '@components/formatted_text';
import StatusBar from '@components/status_bar';
import {CustomStatusDuration, Device} from '@constants';
import {CUSTOM_STATUS_TEXT_CHARACTER_LIMIT, SET_CUSTOM_STATUS_FAILURE} from '@constants/custom_status';
import {withServerUrl} from '@context/server_url';
import {withTheme} from '@context/theme';
import {t} from '@i18n';
import ClearAfter from '@screens/custom_status/components/clear_after';
import RecentCustomStatuses from '@screens/custom_status/components/recent_custom_statuses';
import CustomStatusSuggestion from '@screens/custom_status/custom_status_suggestion';
import {dismissModal, showModal, mergeNavigationOptions, goToScreen} from '@screens/navigation';
import {getCurrentMomentForTimezone} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';

import {getRoundedTime} from '../custom_status_clear_after/date_time_selector';

import CustomStatusEmoji from './components/custom_status_emoji';
import CustomStatusInput from './components/custom_status_input';

type DefaultUserCustomStatus = {
    emoji: string;
    message: string;
    messageDefault: string;
    durationDefault: CustomStatusDuration;
};

const {DONT_CLEAR, THIRTY_MINUTES, ONE_HOUR, FOUR_HOURS, TODAY, THIS_WEEK, DATE_AND_TIME} = CustomStatusDuration;

const defaultCustomStatusSuggestions: DefaultUserCustomStatus[] = [
    {emoji: 'calendar', message: t('custom_status.suggestions.in_a_meeting'), messageDefault: 'In a meeting', durationDefault: CustomStatusDuration.ONE_HOUR},
    {emoji: 'hamburger', message: t('custom_status.suggestions.out_for_lunch'), messageDefault: 'Out for lunch', durationDefault: THIRTY_MINUTES},
    {emoji: 'sneezing_face', message: t('custom_status.suggestions.out_sick'), messageDefault: 'Out sick', durationDefault: TODAY},
    {emoji: 'house', message: t('custom_status.suggestions.working_from_home'), messageDefault: 'Working from home', durationDefault: TODAY},
    {emoji: 'palm_tree', message: t('custom_status.suggestions.on_a_vacation'), messageDefault: 'On a vacation', durationDefault: THIS_WEEK},
];

const defaultDuration: CustomStatusDuration = TODAY;

interface Props extends NavigationComponentProps {
    intl: IntlShape;
    theme: Theme;
    customStatus: UserCustomStatus;
    userTimezone: string;
    recentCustomStatuses: UserCustomStatus[];
    isLandscape: boolean;

    // actions: {
    //     setCustomStatus: (customStatus: UserCustomStatus) => Promise<ActionResult>;
    //     unsetCustomStatus: () => ActionFunc;
    //     removeRecentCustomStatus: (customStatus: UserCustomStatus) => ActionFunc;
    // };
    isExpirySupported: boolean;
    isCustomStatusExpired: boolean;
}

type State = {
    emoji?: string;
    text?: string;
    duration: CustomStatusDuration;
    expires_at: Moment;
}

class CustomStatusModal extends NavigationComponent<Props, State> {
    rightButton: OptionsTopBarButton = {
        id: 'update-custom-status',
        testID: 'custom_status.done.button',
        enabled: true,
        showAsAction: 'always',
    };

    static options(): Options {
        return {
            topBar: {
                title: {
                    alignment: 'center',
                },
            },
        };
    }

    constructor(props: Props) {
        super(props);
        const {customStatus, userTimezone, isCustomStatusExpired, intl, theme, componentId} = props;

        this.rightButton.text = intl.formatMessage({id: 'mobile.custom_status.modal_confirm', defaultMessage: 'Done'});
        this.rightButton.color = theme.sidebarHeaderTextColor;

        const options: Options = {
            topBar: {
                rightButtons: [this.rightButton],
            },
        };
        mergeNavigationOptions(componentId, options);

        const currentTime = getCurrentMomentForTimezone(userTimezone);

        let initialCustomExpiryTime: Moment = getRoundedTime(currentTime);
        const isCurrentCustomStatusSet = !isCustomStatusExpired && (customStatus?.text || customStatus?.emoji);
        if (isCurrentCustomStatusSet && customStatus?.duration === DATE_AND_TIME && customStatus?.expires_at) {
            initialCustomExpiryTime = moment(customStatus?.expires_at);
        }

        this.state = {
            emoji: isCurrentCustomStatusSet ? customStatus?.emoji : '',
            text: isCurrentCustomStatusSet ? customStatus?.text : '',
            duration: isCurrentCustomStatusSet ? (customStatus?.duration ?? DONT_CLEAR) : defaultDuration,
            expires_at: initialCustomExpiryTime,
        };
    }

    componentDidMount() {
        Navigation.events().bindComponent(this);
    }

    navigationButtonPressed({buttonId}: NavigationButtonPressedEvent) {
        switch (buttonId) {
            case 'update-custom-status':
                this.handleSetStatus();
                break;
        }
    }

    handleSetStatus = async () => {
        const {emoji, text, duration} = this.state;
        const isStatusSet = emoji || text;
        const {customStatus, isExpirySupported, serverUrl} = this.props;
        if (isStatusSet) {
            let isStatusSame = customStatus?.emoji === emoji && customStatus?.text === text && customStatus?.duration === duration;
            if (isStatusSame && duration === DATE_AND_TIME) {
                isStatusSame = customStatus?.expires_at === this.calculateExpiryTime(duration);
            }
            if (!isStatusSame) {
                const status: UserCustomStatus = {
                    emoji: emoji || 'speech_balloon',
                    text: text?.trim(),
                    duration: DONT_CLEAR,
                };

                if (isExpirySupported) {
                    status.duration = duration;
                    status.expires_at = this.calculateExpiryTime(duration);
                }
                const {error} = await this.props.actions.setCustomStatus(status);
                if (error) {
                    DeviceEventEmitter.emit(SET_CUSTOM_STATUS_FAILURE);
                }
            }
        } else if (customStatus?.emoji) {
            unsetCustomStatus();
        }
        Keyboard.dismiss();
        dismissModal();
    };

    calculateExpiryTime = (duration: CustomStatusDuration): string => {
        const {userTimezone} = this.props;
        const currentTime = getCurrentMomentForTimezone(userTimezone);
        const {expires_at} = this.state;
        switch (duration) {
            case THIRTY_MINUTES:
                return currentTime.add(30, 'minutes').seconds(0).milliseconds(0).toISOString();
            case ONE_HOUR:
                return currentTime.add(1, 'hour').seconds(0).milliseconds(0).toISOString();
            case FOUR_HOURS:
                return currentTime.add(4, 'hours').seconds(0).milliseconds(0).toISOString();
            case TODAY:
                return currentTime.endOf('day').toISOString();
            case THIS_WEEK:
                return currentTime.endOf('week').toISOString();
            case DATE_AND_TIME:
                return expires_at.toISOString();
            case DONT_CLEAR:
            default:
                return '';
        }
    };

    handleTextChange = (value: string) => this.setState({text: value});

    //todo: this.props.actions.removeRecentCustomStatus
    handleRecentCustomStatusClear = (status: UserCustomStatus) => removeRecentCustomStatus(status);

    clearHandle = () => {
        this.setState({emoji: '', text: '', duration: defaultDuration});
    };

    handleCustomStatusSuggestionClick = (status: UserCustomStatus) => {
        const {emoji, text, duration} = status;
        this.setState({emoji, text, duration});
    };

    handleRecentCustomStatusSuggestionClick = (status: UserCustomStatus) => {
        const {emoji, text, duration} = status;
        this.setState({emoji, text, duration: duration || DONT_CLEAR});
        if (duration === DATE_AND_TIME) {
            this.openClearAfterModal();
        }
    };

    renderCustomStatusSuggestions = (style: Record<string, StyleProp<ViewStyle>>) => {
        const {recentCustomStatuses, theme, intl, isExpirySupported} = this.props;
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
                    handleSuggestionClick={this.handleCustomStatusSuggestionClick}
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
                    <View style={style.block}>
                        {customStatusSuggestions}
                    </View>
                </View>
            </>
        );
    };

    openEmojiPicker = preventDoubleTap(() => {
        const {theme, intl} = this.props;
        CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor).then((source) => {
            const screen = 'AddReaction';
            const title = intl.formatMessage({id: 'mobile.custom_status.choose_emoji', defaultMessage: 'Choose an emoji'});
            const passProps = {
                closeButton: source,
                onEmojiPress: this.handleEmojiClick,
            };

            showModal(screen, title, passProps);
        });
    });

    handleEmojiClick = (emoji: string) => {
        dismissModal();
        this.setState({emoji});
    }

    handleClearAfterClick = (duration: CustomStatusDuration, expires_at: string) =>
        this.setState({
            duration,
            expires_at: duration === DATE_AND_TIME && expires_at ? moment(expires_at) : this.state.expires_at,
        });

    openClearAfterModal = async () => {
        const {intl, theme} = this.props;
        const screen = 'ClearAfter';
        const title = intl.formatMessage({id: 'mobile.custom_status.clear_after', defaultMessage: 'Clear After'});
        const passProps = {
            handleClearAfterClick: this.handleClearAfterClick,
            initialDuration: this.state.duration,
            intl,
            theme,
        };

        goToScreen(screen, title, passProps);
    };

    render() {
        const {emoji, text, duration, expires_at} = this.state;
        const {currentUser, theme, intl, isExpirySupported, recentCustomStatuses} = this.props;

        const isStatusSet = Boolean(emoji || text);
        const style = getStyleSheet(theme);
        const isLandscape = dimensions.width > dimensions.height;

        let keyboardOffset = Device.IS_IPHONE_WITH_INSETS ? 110 : 60;
        if (isLandscape) {
            keyboardOffset = Device.IS_IPHONE_WITH_INSETS ? 0 : 10;
        }

        return (
            <SafeAreaView
                testID='custom_status.screen'
                style={style.container}
            >
                <KeyboardAvoidingView
                    behavior='padding'
                    style={style.container}
                    keyboardVerticalOffset={keyboardOffset}
                    enabled={Platform.OS === 'ios'}
                >
                    <ScrollView
                        bounces={false}
                    >
                        <StatusBar theme={theme}/>
                        <View style={style.scrollView}>
                            <View style={style.block}>
                                <CustomStatusInput
                                    emoji={emoji}
                                    intl={intl}
                                    isStatusSet={isStatusSet}
                                    onChangeText={this.handleTextChange}
                                    onClearHandle={this.clearHandle}
                                    onOpenEmojiPicker={this.openEmojiPicker}
                                    text={text}
                                    theme={theme}
                                />
                                {isStatusSet && isExpirySupported && (
                                    <ClearAfter
                                        currentUser={currentUser}
                                        duration={duration}
                                        expiresAt={expires_at}
                                        intl={intl}
                                        onOpenClearAfterModal={this.openClearAfterModal}
                                        theme={theme}
                                    />)}
                            </View>
                            {recentCustomStatuses.length > 0 && (
                                <RecentCustomStatuses
                                    isExpirySupported={isExpirySupported}
                                    onHandleClear={this.handleRecentCustomStatusClear}
                                    onHandleSuggestionClick={this.handleRecentCustomStatusSuggestionClick}
                                    recentCustomStatuses={recentCustomStatuses}
                                    theme={theme}
                                />
                            )}
                            {this.renderCustomStatusSuggestions(style)}
                        </View>
                        <View style={style.separator}/>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }
}

export default injectIntl(withTheme(withServerUrl(CustomStatusModal)));

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        scrollView: {
            flex: 1,
            paddingTop: 32,
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
