// Copyright (c) 2022-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    StyleSheet,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';


export type Props = {
    id: string,
    // item: object,
    onPress?: (index: string) => void,
    enabled: boolean,
    selectable: boolean,
    selected: boolean,
    children: JSX.Element | JSX.Element[],
    testID?: string,
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
    enabled = true, id, onPress, testID = "", selectable, selected, children,
}: Props) => {
    // TODO Replace conditionaltouchable
    return (
        <View style={style.container}>
            {selectable &&
                <View style={style.selectorContainer}>
                    <View style={[style.selector, (selected && style.selectorFilled), (!enabled && style.selectorDisabled)]}>
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
            <View style={style.children}>
                {children}
            </View>
        </View>
    );
}

export default CustomListRow;
