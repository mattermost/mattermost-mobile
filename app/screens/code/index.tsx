// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect} from 'react';
import {StyleSheet, View, type TextStyle} from 'react-native';

import NavigationButton from '@components/navigation_button';
import SyntaxHiglight from '@components/syntax_highlight';
import {Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import {showSnackBar} from '@utils/snack_bar';

export type CodeScreenProps = {
    code: string;
    language: string;
    textStyle: TextStyle;
}

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const CodeScreen = ({code, language, textStyle}: CodeScreenProps) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const managedConfig = useManagedConfig<ManagedConfig>();
    useAndroidHardwareBackHandler(Screens.CODE, navigateBack);

    const copyToClipboard = useCallback(() => {
        if (!code) {
            return;
        }

        Clipboard.setString(code);
        showSnackBar({barType: SNACK_BAR_TYPE.CODE_COPIED, sourceScreen: Screens.CODE});
    }, [code]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    iconName='content-copy'
                    iconSize={24}
                    color={theme.centerChannelColor}
                    onPress={copyToClipboard}
                    testID='copy-code'
                />
            ),
        });
    }, [copyToClipboard, navigation, theme.centerChannelColor]);

    return (
        <View style={styles.flex}>
            <SyntaxHiglight
                code={code}
                language={language}
                selectable={managedConfig.copyAndPasteProtection !== 'true'}
                textStyle={textStyle}
            />
        </View>
    );
};

export default CodeScreen;
