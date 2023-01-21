// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Pressable, Text} from 'react-native';

import {useTheme} from '@app/context/theme';
import {makeStyleSheetFromTheme} from '@app/utils/theme';
import CompassIcon from '@components/compass_icon';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        scrollToEndBtn: {
            position: 'absolute',
            alignSelf: 'center',
            width: 40,
            height: 40,
            borderRadius: 40,
            top: -50,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            backgroundColor: theme.buttonColor,
            elevation: 4,
        },
        scrollToEndBadge: {
            position: 'absolute',
            alignSelf: 'center',
            height: 40,
            borderRadius: 8,
            top: -50,
            paddingHorizontal: 8,
            backgroundColor: theme.buttonBg,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            elevation: 4,
        },
        newMessagesText: {
            color: '#fff',
            paddingHorizontal: 8,
        },
        pressableBtn: {
            scaleY: -1,
            flexDirection: 'row',
        },
    };
});

type Props = {
    onScrollToEnd: () => void;
    isNewMessage: boolean;
    showScrollToEndBtn: boolean;
    message: string;
};

const ScrollToEndView = ({onScrollToEnd, isNewMessage, showScrollToEndBtn, message}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const translationY = useRef(new Animated.Value(0)).current;

    const scrollBtnStyles = useMemo(() => (isNewMessage ? styles.scrollToEndBadge : styles.scrollToEndBtn), [isNewMessage]);

    useEffect(() => {
        if (showScrollToEndBtn) {
            Animated.timing(translationY, {
                toValue: 60,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(translationY, {
                toValue: 0,
                useNativeDriver: true,
            }).start();
        }
    }, [showScrollToEndBtn]);

    return (
        <Animated.View style={[{transform: [{translateY: translationY}]}, scrollBtnStyles]}>
            <Pressable
                onPress={onScrollToEnd}
                style={styles.pressableBtn}
            >
                <CompassIcon
                    size={18}
                    name='arrow-down'
                    color={isNewMessage ? theme.sidebarHeaderTextColor : theme.centerChannelBg}
                />
                {isNewMessage && (
                    <Text style={styles.newMessagesText}>
                        {message}
                    </Text>
                )}
            </Pressable>
        </Animated.View>
    );
};

export default React.memo(ScrollToEndView);
