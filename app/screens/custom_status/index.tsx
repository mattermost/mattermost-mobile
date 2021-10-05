// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import moment, {Moment} from 'moment-timezone';
import React from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {DeviceEventEmitter, Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, View} from 'react-native';
import {EventSubscription, Navigation, NavigationButtonPressedEvent, NavigationComponent, NavigationComponentProps, Options} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {switchMap, catchError} from 'rxjs/operators';

import {updateLocalCustomStatus} from '@actions/local/user';
import {removeRecentCustomStatus, updateCustomStatus, unsetCustomStatus} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import StatusBar from '@components/status_bar';
import {CustomStatusDuration, Device, Screens} from '@constants';
import {SET_CUSTOM_STATUS_FAILURE} from '@constants/custom_status';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {withServerUrl} from '@context/server_url';
import {withTheme} from '@context/theme';
import {dismissModal, goToScreen, mergeNavigationOptions, showModal} from '@screens/navigation';
import {getCurrentMomentForTimezone, isCustomStatusExpirySupported, safeParseJSON} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {
    getRecentCustomStatus,
    getTimezone,
    getUserCustomStatus,
    isCustomStatusExpired as verifyExpiredStatus,
} from '@utils/user';

import {getRoundedTime} from '../custom_status_clear_after/components/date_time_selector';

import ClearAfter from './components/clear_after';
import CustomStatusInput from './components/custom_status_input';
import CustomStatusSuggestions from './components/custom_status_suggestions';
import RecentCustomStatuses from './components/recent_custom_statuses';

import type Database from '@nozbe/watermelondb/Database';
import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {SYSTEM, USER}} = MM_TABLES;

interface Props extends NavigationComponentProps {
    config: ClientConfig;
    currentUser: UserModel;
    database: Database;
    intl: IntlShape;
    isExpirySupported: boolean;
    recentCustomStatuses: SystemModel;
    serverUrl: string;
    theme: Theme;
}

type State = {
    emoji?: string;
    text?: string;
    duration: CustomStatusDuration;
    expires_at: Moment;
    isLandScape: boolean;
};

const {DONT_CLEAR, THIRTY_MINUTES, ONE_HOUR, FOUR_HOURS, TODAY, THIS_WEEK, DATE_AND_TIME} = CustomStatusDuration;
const DEFAULT_DURATION: CustomStatusDuration = TODAY;

const BTN_UPDATE_STATUS = 'update-custom-status';

class CustomStatusModal extends NavigationComponent<Props, State> {
    private navigationEventListener: EventSubscription | undefined;
    private isCustomStatusExpired: boolean | undefined;

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
        const {intl, theme, componentId} = props;

        this.setUp();
        mergeNavigationOptions(componentId, {
            topBar: {
                rightButtons: [
                    {
                        enabled: true,
                        id: BTN_UPDATE_STATUS,
                        showAsAction: 'always',
                        testID: 'custom_status.done.button',
                        text: intl.formatMessage({id: 'mobile.custom_status.modal_confirm', defaultMessage: 'Done'}),
                        color: theme.sidebarHeaderTextColor,
                    },
                ],
            },
        });
    }

    setUp = () => {
        const {currentUser} = this.props;
        const userTimezone = getTimezone(currentUser.timezone);

        const customStatus = this.getCustomStatus();

        this.isCustomStatusExpired = verifyExpiredStatus(currentUser);

        const currentTime = getCurrentMomentForTimezone(userTimezone ?? '');

        let initialCustomExpiryTime: Moment = getRoundedTime(currentTime);
        const isCurrentCustomStatusSet = !this.isCustomStatusExpired && (customStatus?.text || customStatus?.emoji);
        if (isCurrentCustomStatusSet && customStatus?.duration === DATE_AND_TIME && customStatus?.expires_at) {
            initialCustomExpiryTime = moment(customStatus?.expires_at);
        }

        this.state = {
            duration: isCurrentCustomStatusSet ? customStatus?.duration ?? DONT_CLEAR : DEFAULT_DURATION,
            emoji: isCurrentCustomStatusSet ? customStatus?.emoji : '',
            expires_at: initialCustomExpiryTime,
            isLandScape: false,
            text: isCurrentCustomStatusSet ? customStatus?.text : '',
        };
    };

    getCustomStatus = () => {
        const {currentUser} = this.props;
        const cst = getUserCustomStatus(currentUser);
        if (cst) {
            return safeParseJSON(cst) as unknown as UserCustomStatus;
        }
        return undefined;
    };

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    componentWillUnmount() {
        if (this.navigationEventListener) {
            this.navigationEventListener.remove();
        }
    }

    componentDidAppear() {
        //todo: verify if this works correctly on tablet layout
        const {width, height} = Dimensions.get('screen');
        this.setState({
            isLandScape: width > height,
        });
    }

    navigationButtonPressed({buttonId}: NavigationButtonPressedEvent) {
        switch (buttonId) {
            case BTN_UPDATE_STATUS:
                this.handleSetStatus();
                break;
        }
    }

    handleSetStatus = async () => {
        const {config, currentUser, serverUrl, recentCustomStatuses} = this.props;
        const {emoji, text, duration} = this.state;
        const customStatus = this.getCustomStatus();
        const isExpirySupported = isCustomStatusExpirySupported(config);
        const recentStatuses = getRecentCustomStatus(recentCustomStatuses);

        const isStatusSet = emoji || text;
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
                const {error, data = undefined} = await updateCustomStatus(serverUrl, currentUser, status);
                if (error) {
                    DeviceEventEmitter.emit(SET_CUSTOM_STATUS_FAILURE);
                }

                if (data) {
                    await updateLocalCustomStatus({
                        recentStatuses,
                        serverUrl,
                        status,
                        user: currentUser,
                    });

                    this.setState({
                        duration: status.duration,
                        emoji: status.emoji,
                        expires_at: moment(status.expires_at),
                        text: status.text,
                    });
                }
            }
        } else if (customStatus?.emoji) {
            const unsetResponse = await unsetCustomStatus(serverUrl);

            if (unsetResponse?.data) {
                await updateLocalCustomStatus({
                    recentStatuses,
                    serverUrl,
                    status: undefined,
                    user: currentUser,
                });
            }
        }
        Keyboard.dismiss();
        dismissModal();
    };

    calculateExpiryTime = (duration: CustomStatusDuration): string => {
        const {currentUser} = this.props;
        const userTimezone = getTimezone(currentUser.timezone);
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

    handleTextChange = (value: string) => {
        this.setState({text: value});
    };

    handleRecentCustomStatusClear = async (status: UserCustomStatus) => {
        const {database, recentCustomStatuses, serverUrl} = this.props;
        const response = await removeRecentCustomStatus(serverUrl, status);

        if (response?.data) {
            const rcst = getRecentCustomStatus(recentCustomStatuses);
            const removeIndex = rcst.findIndex((cs) => {
                return (
                    cs.emoji === status.emoji &&
                        cs.text === status.text &&
                        cs.duration === status.duration &&
                        cs.expires_at === status.expires_at
                );
            });
            rcst.splice(removeIndex, 1);

            try {
                await database.write(async () => {
                    await recentCustomStatuses.update((system: SystemModel) => {
                        system.value = JSON.stringify(rcst);
                    });
                });
            } catch (e) {
                // do nothing
            }
        }
    };

    clearHandle = () => {
        this.setState({emoji: '', text: '', duration: DEFAULT_DURATION});
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

    openEmojiPicker = preventDoubleTap(() => {
        const {theme, intl} = this.props;
        CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor).then((source) => {
            const screen = Screens.ADD_REACTION;
            const title = intl.formatMessage({id: 'mobile.custom_status.choose_emoji', defaultMessage: 'Choose an emoji'});
            const passProps = {closeButton: source, onEmojiPress: this.handleEmojiClick};

            showModal(screen, title, passProps);
        });
    });

    handleEmojiClick = (emoji: string) => {
        dismissModal();
        this.setState({emoji});
    };

    handleClearAfterClick = (duration: CustomStatusDuration, expires_at: string) =>
        this.setState({
            duration,
            expires_at: duration === DATE_AND_TIME && expires_at ? moment(expires_at) : this.state.expires_at,
        });

    openClearAfterModal = async () => {
        const {intl, theme} = this.props;
        const screen = Screens.CLEAR_AFTER;
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
        const {duration, emoji, expires_at, isLandScape, text} = this.state;
        const {config, currentUser, intl, recentCustomStatuses, theme} = this.props;

        let keyboardOffset = Device.IS_IPHONE_WITH_INSETS ? 110 : 60;
        if (isLandScape) {
            keyboardOffset = Device.IS_IPHONE_WITH_INSETS ? 0 : 10;
        }

        const isStatusSet = Boolean(emoji || text);
        const isExpirySupported = isCustomStatusExpirySupported(config);
        const recentStatuses = getRecentCustomStatus(recentCustomStatuses);

        const style = getStyleSheet(theme);

        return (
            <SafeAreaView
                style={style.container}
                testID='custom_status.screen'
            >
                <KeyboardAvoidingView
                    behavior='padding'
                    enabled={Platform.OS === 'ios'}
                    keyboardVerticalOffset={keyboardOffset}
                    style={style.container}
                >
                    <ScrollView bounces={false}>
                        <StatusBar theme={theme}/>
                        <View style={style.scrollView}>
                            <View style={style.block}>
                                <CustomStatusInput
                                    emoji={emoji}
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
                                    />
                                )}
                            </View>
                            {recentStatuses.length > 0 && (
                                <RecentCustomStatuses
                                    isExpirySupported={isExpirySupported}
                                    onHandleClear={this.handleRecentCustomStatusClear}
                                    onHandleSuggestionClick={this.handleRecentCustomStatusSuggestionClick}
                                    recentCustomStatuses={recentStatuses}
                                    theme={theme}
                                />
                            )
                            }
                            <CustomStatusSuggestions
                                intl={intl}
                                isExpirySupported={isExpirySupported}
                                onHandleCustomStatusSuggestionClick={this.handleCustomStatusSuggestionClick}
                                recentCustomStatuses={recentStatuses}
                                theme={theme}
                            />
                        </View>
                        <View style={style.separator}/>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }
}

const augmentCSM = injectIntl(withTheme(withServerUrl(CustomStatusModal)));

const enhancedCSM = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: database.
        get(SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).
        pipe(switchMap((id: SystemModel) => database.get(USER).findAndObserve(id.value))),

    config: database.
        get(SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).
        pipe(switchMap((cfg: SystemModel) => of$(cfg.value))),

    recentCustomStatuses: database.
        get(SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.RECENT_CUSTOM_STATUS).pipe(
            catchError(() => of$(null)),
        ),
}));

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
    };
});

export default withDatabase(enhancedCSM(augmentCSM));
