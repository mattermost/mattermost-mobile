// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import MattermostShare, {type ShareExtensionDataToSend, type SharedItem} from '@mattermost/rnshare';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React, {useEffect, useMemo, useState} from 'react';
import {IntlProvider} from 'react-intl';
import {Appearance, BackHandler} from 'react-native';

import {getDefaultThemeByAppearance} from '@context/theme';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {initialize} from '@init/app';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {extractStartLink, isValidUrl} from '@utils/url';

import ChannelsScreen from './screens/channels';
import ServersScreen from './screens/servers';
import ShareScreen from './screens/share';

const Stack = createStackNavigator();

const closeExtension = (data: ShareExtensionDataToSend | null) => {
    MattermostShare.close(data);
};

const ShareExtension = () => {
    const [data, setData] = useState<SharedItem[]>();
    const [theme, setTheme] = useState<Theme>(getDefaultThemeByAppearance());

    const defaultNavigationOptions = useMemo(() => ({
        headerStyle: {
            backgroundColor: theme.sidebarHeaderBg,
        },
        headerTitleStyle: {
            marginHorizontal: 0,
            left: 0,
            color: theme.sidebarHeaderTextColor,
        },
        headerBackTitleStyle: {
            color: theme.sidebarHeaderTextColor,
            margin: 0,
        },
        headerTintColor: theme.sidebarHeaderTextColor,
        headerTopInsetEnabled: false,
        cardStyle: {backgroundColor: theme.centerChannelBg},
    }), [theme]);

    const {text: message, link: linkPreviewUrl} = useMemo(() => {
        let text = data?.filter((i) => i.isString)[0]?.value;
        let link;
        if (text) {
            const first = extractStartLink(text);
            if (first && isValidUrl(first)) {
                link = first;
                text = text.replace(first, '');
            }
        }

        return {text, link};
    }, [data]);

    const files = useMemo(() => {
        return data?.filter((i) => !i.isString) || [];
    }, [data]);

    useEffect(() => {
        // Since the share functionality inits the app, the init mark gets set
        // at this point. Therefore, any check on load times after this is done
        // over the wrong value.
        PerformanceMetricsManager.skipLoadMetric();
    }, []);

    useEffect(() => {
        initialize().finally(async () => {
            const items = await MattermostShare.getSharedData();
            setData(items);
        });

        const backListener = BackHandler.addEventListener('hardwareBackPress', () => {
            const scene = MattermostShare.getCurrentActivityName();
            if (scene === 'ShareActivity') {
                closeExtension(null);
                return true;
            }
            return false;
        });

        const appearanceListener = Appearance.addChangeListener(() => {
            setTheme(getDefaultThemeByAppearance());
        });

        return () => {
            backListener.remove();
            appearanceListener.remove();
        };
    }, []);

    if (!data) {
        return null;
    }

    return (
        <IntlProvider
            locale={DEFAULT_LOCALE}
            messages={getTranslations(DEFAULT_LOCALE)}
        >
            <NavigationContainer>
                <Stack.Navigator
                    initialRouteName='Share'
                    screenOptions={defaultNavigationOptions}
                >
                    <Stack.Screen name='Share'>
                        {() => (
                            <ShareScreen
                                files={files}
                                linkPreviewUrl={linkPreviewUrl}
                                message={message}
                                theme={theme}
                            />
                        )}
                    </Stack.Screen>
                    <Stack.Screen name='Servers'>
                        {() => (
                            <ServersScreen theme={theme}/>
                        )}
                    </Stack.Screen>
                    <Stack.Screen name='Channels'>
                        {() => (
                            <ChannelsScreen theme={theme}/>
                        )}
                    </Stack.Screen>
                </Stack.Navigator>
            </NavigationContainer>
        </IntlProvider>
    );
};

export default ShareExtension;
