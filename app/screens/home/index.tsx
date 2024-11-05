// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import RNUtils from '@mattermost/rnutils';
import {createBottomTabNavigator, type BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {NavigationContainer} from '@react-navigation/native';
import {Button} from '@rneui/base';
import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Alert, DeviceEventEmitter, Platform, ScrollView, Text, TextInput, View, type TextInputProps} from 'react-native';
import {enableFreeze, enableScreens} from 'react-native-screens';

import {autoUpdateTimezone} from '@actions/remote/user';
import ServerVersion from '@components/server_version';
import {Events, Launch, Screens} from '@constants';
import {ExtraKeyboard, ExtraKeyboardProvider, useExtraKeyboardContext, useHideExtraKeyboardIfNeeded} from '@context/extra_keyboard';
import {useTheme} from '@context/theme';
import {useAppState} from '@hooks/device';
import {getAllServers} from '@queries/app/servers';
import {findChannels, popToRoot} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {alertInvalidDeepLink, handleDeepLink} from '@utils/deep_link';
import {logError} from '@utils/log';
import {alertChannelArchived, alertChannelRemove, alertTeamRemove} from '@utils/navigation';
import {notificationError} from '@utils/notification';

import Account from './account';
import ChannelList from './channel_list';
import RecentMentions from './recent_mentions';
import SavedMessages from './saved_messages';
import Search from './search';
import TabBar from './tab_bar';

import type {DeepLinkWithData, LaunchProps} from '@typings/launch';

if (Platform.OS === 'ios') {
    // We do this on iOS to avoid conflicts betwen ReactNavigation & Wix ReactNativeNavigation
    enableScreens(false);
}

enableFreeze(true);

type HomeProps = LaunchProps & {
    componentId: string;
};

const Tab = createBottomTabNavigator();

const updateTimezoneIfNeeded = async () => {
    try {
        const servers = await getAllServers();
        for (const server of servers) {
            if (server.url && server.lastActiveAt > 0) {
                autoUpdateTimezone(server.url);
            }
        }
    } catch (e) {
        logError('Localize change', e);
    }
};

export function HomeScreen(props: HomeProps) {
    const theme = useTheme();
    const intl = useIntl();
    const appState = useAppState();

    const handleFindChannels = useCallback(() => {
        if (!NavigationStore.getScreensInStack().includes(Screens.FIND_CHANNELS)) {
            findChannels(
                intl.formatMessage({id: 'find_channels.title', defaultMessage: 'Find Channels'}),
                theme,
            );
        }
    }, [intl, theme]);

    const events = useMemo(() => ({onFindChannels: handleFindChannels}), [handleFindChannels]);
    useHardwareKeyboardEvents(events);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.NOTIFICATION_ERROR, (value: 'Team' | 'Channel' | 'Post' | 'Connection') => {
            notificationError(intl, value);
        });

        return () => {
            listener.remove();
        };
    }, [intl.locale]);

    useEffect(() => {
        const leaveTeamListener = DeviceEventEmitter.addListener(Events.LEAVE_TEAM, (displayName: string) => {
            alertTeamRemove(displayName, intl);
        });

        const leaveChannelListener = DeviceEventEmitter.addListener(Events.LEAVE_CHANNEL, (displayName: string) => {
            alertChannelRemove(displayName, intl);
        });

        const archivedChannelListener = DeviceEventEmitter.addListener(Events.CHANNEL_ARCHIVED, (displayName: string) => {
            alertChannelArchived(displayName, intl);
        });

        const crtToggledListener = DeviceEventEmitter.addListener(Events.CRT_TOGGLED, (isSameServer: boolean) => {
            if (isSameServer) {
                popToRoot();
            }
        });

        return () => {
            leaveTeamListener.remove();
            leaveChannelListener.remove();
            archivedChannelListener.remove();
            crtToggledListener.remove();
        };
    }, [intl.locale]);

    useEffect(() => {
        if (appState === 'active') {
            updateTimezoneIfNeeded();
        }
    }, [appState]);

    useEffect(() => {
        if (props.launchType === Launch.DeepLink) {
            if (props.launchError) {
                alertInvalidDeepLink(intl);
                return;
            }

            const deepLink = props.extra as DeepLinkWithData;
            if (deepLink?.url) {
                handleDeepLink(deepLink.url, intl, props.componentId, true).then((result) => {
                    if (result.error) {
                        alertInvalidDeepLink(intl);
                    }
                });
            }
        }
    }, []);

    return (
        <>
            <NavigationContainer
                theme={{
                    dark: false,
                    colors: {
                        primary: theme.centerChannelColor,
                        background: 'transparent',
                        card: theme.centerChannelBg,
                        text: theme.centerChannelColor,
                        border: 'white',
                        notification: theme.mentionHighlightBg,
                    },
                }}
            >
                <Tab.Navigator
                    screenOptions={{headerShown: false, unmountOnBlur: false, lazy: true}}
                    backBehavior='none'
                    tabBar={(tabProps: BottomTabBarProps) => (
                        <TabBar
                            {...tabProps}
                            theme={theme}
                        />)}
                >
                    <Tab.Screen
                        name={Screens.HOME}
                        options={{tabBarTestID: 'tab_bar.home.tab', unmountOnBlur: false, freezeOnBlur: true}}
                    >
                        {() => <ChannelList {...props}/>}
                    </Tab.Screen>
                    <Tab.Screen
                        name={Screens.SEARCH}
                        component={Search}
                        options={{tabBarTestID: 'tab_bar.search.tab', unmountOnBlur: false, freezeOnBlur: true, lazy: true}}
                    />
                    <Tab.Screen
                        name={Screens.MENTIONS}
                        component={RecentMentions}
                        options={{tabBarTestID: 'tab_bar.mentions.tab', freezeOnBlur: true, lazy: true}}
                    />
                    <Tab.Screen
                        name={Screens.SAVED_MESSAGES}
                        component={SavedMessages}
                        options={{tabBarTestID: 'tab_bar.saved_messages.tab', freezeOnBlur: true, lazy: true}}
                    />
                    <Tab.Screen
                        name={Screens.ACCOUNT}
                        component={Account}
                        options={{tabBarTestID: 'tab_bar.account.tab', freezeOnBlur: true, lazy: true}}
                    />
                </Tab.Navigator>
            </NavigationContainer>
            <ServerVersion/>
        </>
    );
}

const ShowButton = () => {
    const context = useExtraKeyboardContext();

    return (
        <Button
            style={{marginVertical: 10}}
            onPress={() => {
                const comp = <View style={{flex: 1, backgroundColor: 'blue'}}/>;
                context?.showExtraKeyboard(comp);
            }}
        >
            <Text>{'Show'}</Text>
        </Button>
    );
};

const HideButton = () => {
    const onPress = useHideExtraKeyboardIfNeeded(() => {
        Alert.alert('This is the normal event');
    }, []);

    return (
        <Button onPress={onPress}>
            <Text>{'Hide'}</Text>
        </Button>
    );
};

type CustomInputRef = {
    blur: () => void;
    focus: () => void;
    isFocused: () => boolean;
}

const CustomInput = forwardRef<CustomInputRef, TextInputProps>((props, ref) => {
    const context = useExtraKeyboardContext();

    // Create a ref to the TextInput
    const textInputRef = useRef<TextInput>(null);

    // Expose the methods required by CustomInputRef
    useImperativeHandle(ref, () => ({
        blur: () => textInputRef.current?.blur(),
        focus: () => textInputRef.current?.focus(),
        isFocused: () => textInputRef.current?.isFocused() ?? false,
    }));

    return (
        <TextInput
            {...props}
            ref={textInputRef}
            style={{height: 50, width: '90%', backgroundColor: 'white'}}
            onBlur={context?.registerTextInputBlur}
            onFocus={context?.registerTextInputFocus}
        />
    );
});

CustomInput.displayName = 'CustomInput';

export function App() {
    const ref = useRef<TextInput>(null);
    useEffect(() => {
        ref.current?.blur();
        RNUtils.setSoftKeyboardToAdjustNothing();
        return () => {
            RNUtils.setSoftKeyboardToAdjustResize();
        };
    }, []);

    return (
        <ExtraKeyboardProvider>
            <ScrollView
                style={{backgroundColor: 'green'}}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='always'
            >
                <ShowButton/>
                <HideButton/>
            </ScrollView>
            <View style={{backgroundColor: 'red', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 20}}>
                <CustomInput ref={ref}/>
            </View>
            <ExtraKeyboard/>
        </ExtraKeyboardProvider>
    );
}

export default HomeScreen;
