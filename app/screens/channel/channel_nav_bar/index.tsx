// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelTitle from './channel_title';

type ChannelNavBar = {
    onPress: () => void,
    theme: Theme
}

const ChannelNavBar = ({onPress, theme}: ChannelNavBar) => {
    const insets = useSafeAreaInsets();
    const style = getStyleFromTheme(theme);
    const height = 0;
    const canHaveSubtitle = true;

    // const drawerButtonVisible = () => {
    //     if (Platform.OS === 'android') {
    //         return true;
    //     }
    //
    //     return (!DeviceTypes.IS_TABLET || splitView || !permanentSidebar);
    // };

    // const handleDimensions = () => {
    //     if (DeviceTypes.IS_TABLET) {
    //         mattermostManaged.isRunningInSplitView().then((result) => {
    //             const isSplitView = Boolean(result.isSplitView);
    //             setSplitView(isSplitView);
    //         });
    //     }
    // };

    // const handlePermanentSidebar = async () => {
    //     if (DeviceTypes.IS_TABLET) {
    //         try {
    //             const enabled = await AsyncStorage.getItem(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS);
    //             setPermanentSidebar(enabled === 'true');
    //         } catch {
    //             // do nothing
    //         }
    //     }
    // };

    // const onLayout = ({nativeEvent}) => {
    //     const {height: layouHeight} = nativeEvent.layout;
    //     if (height !== layouHeight && Platform.OS === 'ios') {
    //         height = layouHeight;
    //     }
    //
    //     EventEmitter.emit(CHANNEL_NAV_BAR_CHANGED, layouHeight);
    // };

    // useEffect(() => {
    //     handleDimensions();
    //     handlePermanentSidebar();
    //     Dimensions.addEventListener('change', handleDimensions);
    //     EventEmitter.on(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, handlePermanentSidebar);
    //
    //     return () => {
    //         Dimensions.removeEventListener('change', handleDimensions);
    //         EventEmitter.off(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, handlePermanentSidebar);
    //     };
    // }, []);

    // switch (Platform.OS) {
    //     case 'android':
    //         height = ANDROID_TOP_PORTRAIT;
    //         if (DeviceTypes.IS_TABLET) {
    //             height = ANDROID_TOP_LANDSCAPE;
    //         }
    //         break;
    //     case 'ios':
    //         height = IOS_TOP_PORTRAIT - STATUS_BAR_HEIGHT;
    //         if (DeviceTypes.IS_TABLET && isLandscape) {
    //             height -= 1;
    //         } else if (isLandscape) {
    //             height = IOS_TOP_LANDSCAPE;
    //             canHaveSubtitle = false;
    //         }
    //
    //         if (DeviceTypes.IS_IPHONE_WITH_INSETS && isLandscape) {
    //             canHaveSubtitle = false;
    //         }
    //         break;
    // }

    //todo: Read Messages - Include MainSidebarDrawerButton, ChannelSearchButton, SettingsSidebarDrawerButton
    //todo: Read Messages - Handle orientation change and include methods such as drawerButtonVisible, handleDimensions, handlePermanentSidebar, onLayout
    return (
        <View

            // onLayout={onLayout}
            style={[style.header, {height: height + insets.top, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right}]}
        >
            <ChannelTitle
                onPress={onPress}
                canHaveSubtitle={canHaveSubtitle}
            />
        </View>
    );
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '100%',
            ...Platform.select({
                android: {
                    elevation: 10,
                },
                ios: {
                    zIndex: 10,
                },
            }),
        },
    };
});

export default ChannelNavBar;
