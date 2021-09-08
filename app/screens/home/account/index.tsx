// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DrawerItem from '@components/drawer_item';
import {useTheme} from '@context/theme';
import {useRoute} from '@react-navigation/native';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import React from 'react';
import {Text, View} from 'react-native';
import Animated, {AnimatedLayout, FadeInLeft, FadeInRight} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.sidebarBg,
        },
    };
});

const AccountScreen = () => {
    const theme = useTheme();
    const route = useRoute();
    const params = route.params! as {direction: string};
    const entering = params.direction === 'left' ? FadeInLeft : FadeInRight;

    const styles = getStyleSheet(theme);

    const goToSavedMessages = () => {};

    return (
        <SafeAreaView style={styles.container}>
            <AnimatedLayout style={{flex: 1}}>
                <Animated.View
                    entering={entering.duration(150)}
                    style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
                >

                    <View
                        style={{
                            backgroundColor: theme.centerChannelBg,
                            width: '100%',
                            height: '60%',
                            position: 'absolute',
                            bottom: 0,
                            borderTopRightRadius: 12,
                            borderTopLeftRadius: 12,
                            overflow: 'hidden',
                        }}
                    >

                        <DrawerItem
                            testID='settings.sidebar.edit_profile.action'
                            defaultMessage='Your Profile'
                            i18nId='mobile.routes.edit_profile'
                            iconName='account-outline'
                            onPress={goToSavedMessages}
                            separator={false}
                            theme={theme}
                        />
                        <DrawerItem
                            testID='settings.sidebar.saved_messages.action'
                            defaultMessage='Saved Messages'
                            i18nId='search_header.title3'
                            iconName='bookmark-outline'
                            onPress={goToSavedMessages}
                            separator={false}
                            theme={theme}
                        />
                        <DrawerItem
                            testID='settings.sidebar.settings.action'
                            defaultMessage='Settings'
                            i18nId='mobile.routes.settings'
                            iconName='settings-outline'
                            onPress={goToSavedMessages}
                            separator={false}
                            theme={theme}
                        />
                        <DrawerItem
                            testID='settings.sidebar.logout.action'
                            defaultMessage='Logout'
                            i18nId='sidebar_right_menu.logout'
                            iconName='exit-to-app'
                            isDestructor={true}
                            onPress={goToSavedMessages}
                            separator={true}
                            theme={theme}
                        />
                    </View>
                </Animated.View>
            </AnimatedLayout>
        </SafeAreaView>
    );
};

export default AccountScreen;
