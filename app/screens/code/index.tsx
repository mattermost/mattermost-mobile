// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback, useEffect} from 'react';
import {StyleSheet, type TextStyle} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import SyntaxHiglight from '@components/syntax_highlight';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {popTopScreen, setButtons} from '@screens/navigation';
import {showSnackBar} from '@utils/snack_bar';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    code: string;
    language: string;
    textStyle: TextStyle;
}

const COPY_CODE_BUTTON = 'copy-code';

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const Code = ({code, componentId, language, textStyle}: Props) => {
    const theme = useTheme();
    const managedConfig = useManagedConfig<ManagedConfig>();
    useAndroidHardwareBackHandler(componentId, popTopScreen);

    const copyToClipboard = useCallback(() => {
        if (!code) {
            return;
        }

        Clipboard.setString(code);
        showSnackBar({barType: SNACK_BAR_TYPE.CODE_COPIED, sourceScreen: componentId});
    }, [code, componentId]);

    useNavButtonPressed(COPY_CODE_BUTTON, componentId, copyToClipboard, [componentId, copyToClipboard]);

    useEffect(() => {
        setButtons(componentId, {
            rightButtons: [
                {
                    id: COPY_CODE_BUTTON,
                    icon: CompassIcon.getImageSourceSync('content-copy', 24, theme.centerChannelColor),
                },
            ],
        });
    }, [theme.centerChannelColor, componentId]);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <SyntaxHiglight
                code={code}
                language={language}
                selectable={managedConfig.copyAndPasteProtection !== 'true'}
                textStyle={textStyle}
            />
        </SafeAreaView>
    );
};

export default Code;
