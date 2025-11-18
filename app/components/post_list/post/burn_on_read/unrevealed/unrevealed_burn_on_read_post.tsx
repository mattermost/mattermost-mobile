// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {revealBoRPost} from '@actions/remote/post';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    buttonBackgroundStyle: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 56,
        marginBottom: 8,
    },
    buttonTextStyle: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
}));

type Props = {
    postId: string;
}

export default function UnrevealedBurnOnReadPost({postId}: Props) {
    const theme = useTheme();
    // const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();

    const handleRevealPost = useCallback(async () => {
        await revealBoRPost(serverUrl, postId);
    }, [postId, serverUrl]);

    // return (
    //     <Button
    //         text={'View message'}
    //         iconName='eye-outline'
    //         theme={theme}
    //         backgroundStyle={styles.buttonBackgroundStyle}
    //         textStyle={styles.buttonTextStyle}
    //         onPress={handleRevealPost}
    //     />
    // );

    return (
        <TouchableOpacity onPress={handleRevealPost}>
            <HeavyFakeBlurText>
                {'Click to reveal this message'}
            </HeavyFakeBlurText>
        </TouchableOpacity>
    );
}

export function HeavyFakeBlurText({
    children,
    style,
}: {
    children: string;
    style?: any;
}) {
    const offsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

    return (
        <View style={{position: 'relative'}}>
            {offsets.flatMap((dx) =>
                offsets.map((dy) => (
                    <Text
                        key={`${dx},${dy}`}
                        style={[
                            style,
                            {
                                position: 'absolute',
                                left: dx,
                                top: dy,
                                opacity: 0.01,
                            },
                        ]}
                    >
                        {children}
                    </Text>
                )),
            )}
            <Text style={[style, {color: 'rgba(255,255,255,0.15)'}]}>
                {children}
            </Text>
        </View>
    );
}
