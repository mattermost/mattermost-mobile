// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {
    type GestureResponderEvent,
    Pressable,
    type PressableStateCallbackType,
    StyleSheet,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';

export type Props = {
    id: string;
    onPress?: (event: GestureResponderEvent) => void;
    enabled: boolean;
    selectable: boolean;
    selected: boolean;
    children: React.ReactNode;
    testID?: string;
};

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
        height: 48,
    },
    children: {
        flex: 1,
        flexDirection: 'row',
    },
    selector: {
        height: 28,
        width: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(61, 60, 64, 0.32)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectorContainer: {
        height: 50,
        paddingRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectorDisabled: {
        borderColor: 'rgba(61, 60, 64, 0.16)',
    },
    selectorFilled: {
        backgroundColor: '#166DE0',
        borderWidth: 0,
    },
});

const CustomListRow = ({
    onPress, children, enabled, selectable, selected, id, testID,
}: Props) => {
    const pressableStyle = useCallback(
        ({pressed}: PressableStateCallbackType) => [style.container, pressed && {opacity: 0.72}],
        [],
    );

    const selectorStyle = useMemo(
        () => [
            style.selector,
            (selected && style.selectorFilled),
            (!enabled && style.selectorDisabled),
        ],
        [selected, enabled],
    );

    return (
        <Pressable
            style={pressableStyle}
            testID={testID}
            onPress={onPress}
        >
            {selectable &&
                <View style={style.selectorContainer}>
                    <View
                        testID={id}
                        style={selectorStyle}
                    >
                        {selected &&
                            <CompassIcon
                                name='check'
                                size={24}
                                color='#fff'
                            />
                        }
                    </View>
                </View>
            }

            <View
                testID={id}
                style={style.children}
            >
                {children}
            </View>
        </Pressable>
    );
};

export default CustomListRow;
