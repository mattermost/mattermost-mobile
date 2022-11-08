// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    GestureResponderEvent,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import CompassIcon from '@app/components/compass_icon';

export type Props = {
    id: string;
    onPress?: (event: GestureResponderEvent) => void;
    enabled: boolean;
    selectable: boolean;
    selected: boolean;
    children: JSX.Element | JSX.Element[];
    testID?: string;
};

const style = StyleSheet.create({
    touchable: {
        flex: 1,
        overflow: 'hidden',
    },
    container: {
        flexDirection: 'row',
        height: 65,
        flex: 1,
        alignItems: 'center',
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
    return (
        <View
            style={style.container}
            testID={testID}
        >
            {selectable &&
                <View style={style.selectorContainer}>
                    <TouchableOpacity
                        testID={id}
                        onPress={onPress}
                        style={[style.selector, (selected && style.selectorFilled), (!enabled &&
 style.selectorDisabled)]}
                    >
                        {selected &&
                            <CompassIcon
                                name='check'
                                size={24}
                                color='#fff'
                            />
                        }
                    </TouchableOpacity>
                </View>
            }

            <TouchableOpacity
                testID={id}
                onPress={onPress}
                style={style.children}
            >
                {children}
            </TouchableOpacity>
        </View>
    );
};

export default CustomListRow;
