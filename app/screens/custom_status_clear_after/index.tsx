// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {injectIntl, type IntlShape} from 'react-intl';
import {BackHandler, type NativeEventSubscription, SafeAreaView, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {
    Navigation,
    type NavigationButtonPressedEvent,
    NavigationComponent,
    type Options,
} from 'react-native-navigation';

import {CustomStatusDurationEnum} from '@constants/custom_status';
import SecurityManager from '@managers/security_manager';
import {observeCurrentUser} from '@queries/servers/user';
import {dismissModal, popTopScreen} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {mergeNavigationOptions} from '@utils/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ClearAfterMenuItem from './components/clear_after_menu_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

interface Props {
    componentId: AvailableScreens;
    currentUser?: UserModel;
    handleClearAfterClick: (duration: CustomStatusDuration, expiresAt: string) => void;
    initialDuration: CustomStatusDuration;
    intl: IntlShape;
    isModal?: boolean;
    theme: Theme;
}

type State = {
    duration: CustomStatusDuration;
    expiresAt: string;
    showExpiryTime: boolean;
}

const CLEAR_AFTER = 'update-custom-status-clear-after';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        scrollView: {
            flex: 1,
            paddingTop: 32,
            paddingBottom: 32,
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
    };
});

class ClearAfterModal extends NavigationComponent<Props, State> {
    private backListener: NativeEventSubscription | undefined;
    constructor(props: Props) {
        super({...props, componentName: 'ClearAfterModal'});

        const options: Options = {
            topBar: {
                rightButtons: [{
                    color: props.theme.sidebarHeaderTextColor,
                    enabled: true,
                    id: CLEAR_AFTER,
                    showAsAction: 'always',
                    testID: 'custom_status_clear_after.done.button',
                    text: props.intl.formatMessage({
                        id: 'mobile.custom_status.modal_confirm',
                        defaultMessage: 'Done',
                    }),
                }],
            },
        };

        mergeNavigationOptions(props.componentId, options);

        this.state = {
            duration: props.initialDuration,
            expiresAt: '',
            showExpiryTime: false,
        };
    }

    componentDidMount() {
        Navigation.events().bindComponent(this);
        this.backListener = BackHandler.addEventListener('hardwareBackPress', this.onBackPress);
    }

    componentWillUnmount() {
        this.backListener?.remove();
    }

    navigationButtonPressed({buttonId}: NavigationButtonPressedEvent) {
        switch (buttonId) {
            case CLEAR_AFTER:
                this.onDone();
                break;
        }
    }

    onBackPress = () => {
        const {componentId} = this.props;
        if (NavigationStore.getVisibleScreen() === componentId) {
            if (this.props.isModal) {
                dismissModal({componentId});
            } else {
                popTopScreen(componentId);
            }

            return true;
        }
        return false;
    };

    onDone = () => {
        const {componentId, handleClearAfterClick, isModal} = this.props;
        handleClearAfterClick(this.state.duration, this.state.expiresAt);
        if (isModal) {
            dismissModal({componentId});
            return;
        }

        popTopScreen(componentId);
    };

    handleItemClick = (duration: CustomStatusDuration, expiresAt: string) =>
        this.setState({
            duration,
            expiresAt,
            showExpiryTime: duration === 'date_and_time' && expiresAt !== '',
        });

    renderClearAfterMenu = () => {
        const {currentUser, theme} = this.props;
        const style = getStyleSheet(theme);

        const {duration} = this.state;

        const clearAfterMenu = Object.values(CustomStatusDurationEnum).map(
            (item, index, arr) => {
                if (index === arr.length - 1) {
                    return null;
                }

                return (
                    <ClearAfterMenuItem
                        currentUser={currentUser}
                        duration={item}
                        handleItemClick={this.handleItemClick}
                        isSelected={duration === item}
                        key={item}
                        separator={index !== arr.length - 2}
                    />
                );
            },
        );

        if (clearAfterMenu.length === 0) {
            return null;
        }

        return (
            <View testID='custom_status_clear_after.menu'>
                <View style={style.block}>{clearAfterMenu}</View>
            </View>
        );
    };

    render() {
        const {componentId, currentUser, theme} = this.props;
        const style = getStyleSheet(theme);
        const {duration, expiresAt, showExpiryTime} = this.state;
        return (
            <SafeAreaView
                style={style.container}
                testID='custom_status_clear_after.screen'
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
                <KeyboardAwareScrollView bounces={false}>
                    <View style={style.scrollView}>
                        {this.renderClearAfterMenu()}
                    </View>
                    <View style={style.block}>
                        <ClearAfterMenuItem
                            currentUser={currentUser}
                            duration={'date_and_time'}
                            expiryTime={expiresAt}
                            handleItemClick={this.handleItemClick}
                            isSelected={duration === 'date_and_time' && expiresAt === ''}
                            separator={false}
                            showDateTimePicker={duration === 'date_and_time'}
                            showExpiryTime={showExpiryTime}
                        />
                    </View>
                </KeyboardAwareScrollView>
            </SafeAreaView>
        );
    }
}

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
}));

export default withDatabase(enhanced(injectIntl(ClearAfterModal)));
