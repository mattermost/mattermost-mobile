// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RaTeXView} from 'ratex-react-native';
import React, {useCallback, useState} from 'react';
import {Text, type StyleProp, type ViewStyle} from 'react-native';

import {useTheme} from '@context/theme';

type MathViewProps = {
    latexCode: string;
    fontSize?: number;
    displayMode?: boolean;
    style?: StyleProp<ViewStyle>;
    errorStyle?: StyleProp<ViewStyle>;
}

type ContentSizeChangeEvent = {
    nativeEvent: {
        width: number;
        height: number;
    };
}

const MathView = ({latexCode, fontSize = 14, displayMode = true, style, errorStyle}: MathViewProps) => {
    const theme = useTheme();
    const [renderError, setRenderError] = useState<string | null>(null);
    const [size, setSize] = useState<{width: number; height: number} | null>(null);

    const handleError = useCallback((e: {nativeEvent: {error: string}}) => {
        setRenderError(e.nativeEvent.error);
    }, []);

    const onContentSizeChange = useCallback(({nativeEvent}: ContentSizeChangeEvent) => {
        setSize(nativeEvent);
    }, []);

    if (renderError) {
        return <Text style={errorStyle}>{'Render error: ' + renderError}</Text>;
    }

    return (
        <RaTeXView
            onContentSizeChange={onContentSizeChange}
            latex={latexCode}
            color={theme.centerChannelColor}
            fontSize={fontSize}
            displayMode={displayMode}
            style={[style, size]}
            onError={handleError}
        />
    );
};

export default MathView;
