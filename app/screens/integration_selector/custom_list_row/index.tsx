// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    type GestureResponderEvent,
    StyleSheet,
    TouchableOpacity,
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
        <TouchableOpacity
            style={style.container}
            testID={testID}
            onPress={onPress}
        >
            {selectable &&
                <View style={style.selectorContainer}>
                    <View
                        testID={id}
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
                    </View>
                </View>
            }

            <View
                testID={id}
                style={style.children}
            >
                {children}
            </View>
        </TouchableOpacity>
    );
};

export default CustomListRow;
