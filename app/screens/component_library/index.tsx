// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, View, type StyleProp, type ViewStyle} from 'react-native';

import AutocompleteSelector from '@components/autocomplete_selector';
import {Preferences, Screens} from '@constants';
import {CustomThemeProvider} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';

import ButtonComponentLibrary from './button.cl';
import ChipComponentLibrary from './chip.cl';
import SectionNoticeComponentLibrary from './section_notice.cl';
import TagComponentLibrary from './tag.cl';

import type {AvailableScreens} from '@typings/screens/navigation';

const componentMap = {
    Button: ButtonComponentLibrary,
    Chip: ChipComponentLibrary,
    Tag: TagComponentLibrary,
    SectionNotice: SectionNoticeComponentLibrary,
};

type ComponentName = keyof typeof componentMap
const defaultComponent = Object.keys(componentMap)[0] as ComponentName;
const componentOptions = Object.keys(componentMap).map((v) => ({
    value: v,
    text: v,
}));

type ThemeName = keyof typeof Preferences.THEMES;
const defaultTheme = Object.keys(Preferences.THEMES)[0] as ThemeName;
const themeOptions = Object.keys(Preferences.THEMES).map((v) => ({
    value: v,
    text: v,
}));

type BackgroundType = 'center' | 'sidebar';
const backgroundOptions = [{
    value: 'center',
    text: 'Center channel',
}, {
    value: 'sidebar',
    text: 'Sidebar background',
}];

type Props = {
    componentId: AvailableScreens;
};

const ComponentLibrary = ({componentId}: Props) => {
    const [selectedComponent, setSelectedComponent] = useState<ComponentName>(defaultComponent);
    const onSelectComponent = useCallback((value: SelectedDialogOption) => {
        if (!value) {
            setSelectedComponent(defaultComponent);
            return;
        }

        if (Array.isArray(value)) {
            setSelectedComponent(value[0].value as ComponentName);
            return;
        }
        setSelectedComponent(value.value as ComponentName);
    }, []);

    const [selectedTheme, setSelectedTheme] = useState(defaultTheme);
    const onSelectTheme = useCallback((value: SelectedDialogOption) => {
        if (!value) {
            setSelectedTheme(defaultTheme);
            return;
        }

        if (Array.isArray(value)) {
            setSelectedTheme(value[0].value as ThemeName);
            return;
        }
        setSelectedTheme(value.value as ThemeName);
    }, []);

    const [selectedBackground, setSelectedBackground] = useState<BackgroundType>('center');
    const onSelectBackground = useCallback((value: SelectedDialogOption) => {
        if (!value) {
            setSelectedBackground('center');
            return;
        }

        if (Array.isArray(value)) {
            setSelectedBackground(value[0].value as BackgroundType);
            return;
        }
        setSelectedBackground(value.value as BackgroundType);
    }, []);

    const backgroundStyle: StyleProp<ViewStyle> = useMemo(() => {
        const theme = Preferences.THEMES[selectedTheme];
        switch (selectedBackground) {
            case 'center':
                return {
                    backgroundColor: theme.centerChannelBg,
                };
            case 'sidebar':
            default:
                return {
                    backgroundColor: theme.sidebarBg,
                };
        }
    }, [selectedBackground, selectedTheme]);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    const SelectedComponent = componentMap[selectedComponent];
    return (
        <ScrollView
            style={{margin: 10}}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <AutocompleteSelector
                testID='selectedComponent'
                label='Component'
                onSelected={onSelectComponent}
                selected={selectedComponent}
                options={componentOptions}
                location={Screens.COMPONENT_LIBRARY}
            />
            <AutocompleteSelector
                testID='selectedTheme'
                label='Theme'
                onSelected={onSelectTheme}
                selected={selectedTheme}
                options={themeOptions}
                location={Screens.COMPONENT_LIBRARY}
            />
            <AutocompleteSelector
                testID='selectedBackground'
                label='Background'
                onSelected={onSelectBackground}
                selected={selectedBackground}
                options={backgroundOptions}
                location={Screens.COMPONENT_LIBRARY}
            />
            <View style={backgroundStyle}>
                <CustomThemeProvider theme={Preferences.THEMES[selectedTheme]}>
                    <SelectedComponent/>
                </CustomThemeProvider>
            </View>
        </ScrollView>
    );
};

export default ComponentLibrary;
