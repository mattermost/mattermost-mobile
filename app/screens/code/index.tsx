// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React from 'react';
import {StyleSheet, TextStyle} from 'react-native';
import {SafeAreaView, Edge} from 'react-native-safe-area-context';

import SyntaxHiglight from '@components/syntax_highlight';

type Props = {
    code: string;
    language: string;
    textStyle: TextStyle;
}

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const Code = ({code, language, textStyle}: Props) => {
    const managedConfig = useManagedConfig<ManagedConfig>();

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
