// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import MenuItem from '@components/menu_item';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {getFormattedFileSize} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            paddingTop: 35,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        containerStyle: {
            backgroundColor: theme.centerChannelBg,
            height: 48,
        },
        fileSize: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
        iconContainerStyle: {
            height: '100%',
        },
        rightComponent: {
            justifyContent: 'center',
            height: '100%',
            marginRight: 10,
        },
    };
});

type AdvancedSettingsProps = {
    componentId: string;
}
const AdvancedSettings = ({componentId}: AdvancedSettingsProps) => {
    const theme = useTheme();
    const [isDeleting, setIsDeleting] = useState(false);
    const [dataSize, setDataSize] = useState<number|undefined>(0);

    const styles = getStyleSheet(theme);

    const onPressDeleteData = useCallback(() => {
        //todo: something
    }, []);

    const close = () => popTopScreen(componentId);

    useAndroidHardwareBackHandler(componentId, close);

    const renderFileSize = () => {
        let component;
        if (isDeleting) {
            component = (
                <ActivityIndicator
                    size='small'
                    color={theme.centerChannelColor}
                />
            );
        } else if (true) {
            component = (
                <View
                    style={styles.rightComponent}
                >
                    <Text
                        style={styles.fileSize}
                    >
                        {getFormattedFileSize(dataSize || 0)}
                    </Text>
                </View>
            );
        }

        return component;
    };

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
            testID='settings_display.screen'
        >
            <View
                style={styles.wrapper}
            >
                <MenuItem
                    containerStyle={styles.containerStyle}
                    defaultMessage='Delete Documents & Data'
                    i18nId='advanced_settings.delete_data'
                    iconContainerStyle={styles.iconContainerStyle}
                    iconName='trash-can-outline'
                    isDestructor={true}
                    onPress={onPressDeleteData}
                    rightComponent={renderFileSize()}
                    separator={false}
                    showArrow={false}
                    testID='advanced_settings.delete_data'
                    theme={theme}
                />
            </View>
        </SafeAreaView>
    );
};

export default AdvancedSettings;
