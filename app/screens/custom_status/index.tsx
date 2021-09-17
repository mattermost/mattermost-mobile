// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import moment, {Moment} from 'moment-timezone';
import React from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {DeviceEventEmitter, Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, View} from 'react-native';
import {EventSubscription, Navigation, NavigationButtonPressedEvent, NavigationComponent, NavigationComponentProps, Options} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {removeRecentCustomStatus, setCustomStatus, unsetCustomStatus} from '@actions/remote/user';
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
import {getTimezone, getUserCustomStatus, isCustomStatusExpired as verifyExpiredStatus} from '@utils/user';

import {getRoundedTime} from '../custom_status_clear_after/components/date_time_selector';

import ClearAfter from './components/clear_after';
import CustomStatusInput from './components/custom_status_input';
import CustomStatusSuggestions from './components/custom_status_suggestions';
import RecentCustomStatuses from './components/recent_custom_statuses';

import type Database from '@nozbe/watermelondb/Database';
import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {PREFERENCE, SYSTEM, USER}} = MM_TABLES;

interface Props extends NavigationComponentProps {
    config: ClientConfig;
    currentUser: UserModel;
    database: Database;
    intl: IntlShape;
    isExpirySupported: boolean;
    prefRecentCST: PreferenceModel;
    recentCustomStatuses: UserCustomStatus[];
    serverUrl: string;
    theme: Theme;
}

type State = {
    emoji?: string;
    text?: string;
    duration: CustomStatusDuration;
    expires_at: Moment;
    isLandScape: boolean;
    track_prev_cst: UserCustomStatus[]; // for screen refresh only
}

const {DONT_CLEAR, THIRTY_MINUTES, ONE_HOUR, FOUR_HOURS, TODAY, THIS_WEEK, DATE_AND_TIME} = CustomStatusDuration;
const DEFAULT_DURATION: CustomStatusDuration = TODAY;

const BTN_UPDATE_STATUS = 'update-custom-status';

class CustomStatusModal extends NavigationComponent<Props, State> {
    private customStatus: UserCustomStatus | undefined;
    private navigationEventListener: EventSubscription | undefined;
    private readonly isCustomStatusExpired: boolean;
    private readonly isExpirySupported: boolean;
    private readonly userTimezone: string;

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
        const {config, currentUser, intl, theme, componentId} = props;
        this.userTimezone = getTimezone(currentUser.timezone);
        this.customStatus = getUserCustomStatus(currentUser);
        this.isCustomStatusExpired = verifyExpiredStatus(currentUser);
        this.isExpirySupported = isCustomStatusExpirySupported(config);

        mergeNavigationOptions(componentId, {
            topBar: {
                rightButtons: [{
                    enabled: true,
                    id: BTN_UPDATE_STATUS,
                    showAsAction: 'always',
                    testID: 'custom_status.done.button',
                    text: intl.formatMessage({id: 'mobile.custom_status.modal_confirm', defaultMessage: 'Done'}),
                    color: theme.sidebarHeaderTextColor,
                }],
            },
        });

        const currentTime = getCurrentMomentForTimezone(this.userTimezone ?? '');

        let initialCustomExpiryTime: Moment = getRoundedTime(currentTime);
        const isCurrentCustomStatusSet = !this.isCustomStatusExpired && (this.customStatus?.text || this.customStatus?.emoji);
        if (isCurrentCustomStatusSet && this.customStatus?.duration === DATE_AND_TIME && this.customStatus?.expires_at) {
            initialCustomExpiryTime = moment(this.customStatus?.expires_at);
        }

        this.state = {
            emoji: isCurrentCustomStatusSet ? this.customStatus?.emoji : '',
            text: isCurrentCustomStatusSet ? this.customStatus?.text : '',
            duration: isCurrentCustomStatusSet ? (this.customStatus?.duration ?? DONT_CLEAR) : DEFAULT_DURATION,
            expires_at: initialCustomExpiryTime,
            isLandScape: false,
            track_prev_cst: [],
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    componentWillUnmount() {
        if (this.navigationEventListener) {
            this.navigationEventListener.remove();
        }
    }

    componentDidAppear() {
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
        const {emoji, text, duration} = this.state;
        const isStatusSet = emoji || text;
        const {currentUser, serverUrl} = this.props;
        if (isStatusSet) {
            let isStatusSame = this.customStatus?.emoji === emoji && this.customStatus?.text === text && this.customStatus?.duration === duration;
            if (isStatusSame && duration === DATE_AND_TIME) {
                isStatusSame = this.customStatus?.expires_at === this.calculateExpiryTime(duration);
            }

            if (!isStatusSame) {
                const status: UserCustomStatus = {
                    emoji: emoji || 'speech_balloon',
                    text: text?.trim(),
                    duration: DONT_CLEAR,
                };

                if (this.isExpirySupported) {
                    status.duration = duration;
                    status.expires_at = this.calculateExpiryTime(duration);
                }
                const {error} = await setCustomStatus(serverUrl, currentUser, status);

                if (error) {
                    DeviceEventEmitter.emit(SET_CUSTOM_STATUS_FAILURE);
                }
            }
        } else if (this.customStatus?.emoji) {
            unsetCustomStatus(serverUrl);
        }
        Keyboard.dismiss();
        dismissModal();
    };

    calculateExpiryTime = (duration: CustomStatusDuration): string => {
        const currentTime = getCurrentMomentForTimezone(this.userTimezone);
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

    handleRecentCustomStatusClear = async (status: UserCustomStatus) => {
        const {database, prefRecentCST, serverUrl} = this.props;

        const response = await removeRecentCustomStatus(serverUrl, status);

        //todo: Need to test this function again - had server issue when I did it.
        if (response.data) {
            const prevCST = this.getRecentCustomStatus();

            const updatedCST = prevCST.filter((cst) => {
                return cst.emoji !== status.emoji && cst.text !== status.text && cst.duration !== status.duration && cst.expires_at !== status.expires_at;
            });

            await database.write(async () => {
                await prefRecentCST.update((pref: PreferenceModel) => {
                    pref.value = JSON.stringify(updatedCST);
                });
            });

            // NOTE: The below setState is a workaround to re-trigger screen refresh after updating the custom statuses in database (since changing a query/array value does not trigger updates)
            this.setState({track_prev_cst: updatedCST});
        }
    }

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

    handleClearAfterClick = (duration: CustomStatusDuration, expires_at: string) => this.setState({
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

    private getRecentCustomStatus = () => {
        const {prefRecentCST} = this.props;

        const rcs = safeParseJSON(prefRecentCST?.value);
        if (typeof rcs === 'string') {
            return [];
        }
        return rcs as unknown as UserCustomStatus[];
    }

    render() {
        const {duration, emoji, expires_at, isLandScape, text} = this.state;
        const {currentUser, intl, theme} = this.props;

        const recentCustomStatuses = this.getRecentCustomStatus();

        let keyboardOffset = Device.IS_IPHONE_WITH_INSETS ? 110 : 60;
        if (isLandScape) {
            keyboardOffset = Device.IS_IPHONE_WITH_INSETS ? 0 : 10;
        }

        const isStatusSet = Boolean(emoji || text);

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
                    <ScrollView
                        bounces={false}
                    >
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
                                {isStatusSet && this.isExpirySupported && (
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
                                    isExpirySupported={this.isExpirySupported}
                                    onHandleClear={this.handleRecentCustomStatusClear}
                                    onHandleSuggestionClick={this.handleRecentCustomStatusSuggestionClick}
                                    recentCustomStatuses={recentCustomStatuses}
                                    theme={theme}
                                />
                            )}
                            <CustomStatusSuggestions
                                intl={intl}
                                isExpirySupported={this.isExpirySupported}
                                onHandleCustomStatusSuggestionClick={this.handleCustomStatusSuggestionClick}
                                recentCustomStatuses={recentCustomStatuses}
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
    currentUser: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(switchMap((id: SystemModel) => database.get(USER).findAndObserve(id.value))),
    prefRecentCST: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId: SystemModel) => database.get(PREFERENCE).query(Q.where('user_id', currentUserId.value), Q.where('name', 'recent_custom_statuses')).observe()),
        map((preference: PreferenceModel[]) => {
            return preference?.[0];
        }),
    ),
    config: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap((cfg: SystemModel) => of$(cfg.value))),
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

