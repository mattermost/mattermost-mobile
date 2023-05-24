// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React from 'react';
import {StyleSheet, type TextStyle} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import SyntaxHiglight from '@components/syntax_highlight';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    code: string;
    language: string;
    textStyle: TextStyle;
}

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const Code = ({code, componentId, language, textStyle}: Props) => {
    const managedConfig = useManagedConfig<ManagedConfig>();
    useAndroidHardwareBackHandler(componentId, popTopScreen);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
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
