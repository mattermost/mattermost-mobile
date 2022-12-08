// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FlatList, ListRenderItemInfo, View} from 'react-native';

import {View as ViewConstants} from '@constants';
import {makeStyleSheetFromTheme} from '@utils/theme';

import SelectedOption from '../selected_option';

type SelectedOption = DialogOption | UserProfile | Channel

type Props = {
    theme: Theme;
    selectedOptions: DialogOption[] | UserProfile[] | Channel[];
    dataSource: string;
    onRemove: (opt: DialogOption | UserProfile | Channel) => void;
}

const getStyleFromTheme = makeStyleSheetFromTheme(() => {
    return {
        container: {
            marginHorizontal: 5,
            marginRight: 5,
            marginBottom: 5,
            maxHeight: 100,
            flexGrow: 0,
            flexDirection: 'row',
        },
        users: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
    };
});

const SelectedOptions = ({
    theme, selectedOptions, onRemove, dataSource,
}: Props) => {
    const style = getStyleFromTheme(theme);

    const renderItem = useCallback(({item}: ListRenderItemInfo<SelectedOption>) => {
        return (
            <SelectedOption
                option={item}
                theme={theme}
                dataSource={dataSource}
                onRemove={onRemove}
            />);
    }, [dataSource, onRemove, theme]);

    const extractKey = useCallback((item: SelectedOption) => {
        let key: string;

        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                key = (item as UserProfile)?.id;
                break;
            case ViewConstants.DATA_SOURCE_CHANNELS:
                key = (item as Channel).id;
                break;
            default:
                key = (item as DialogOption).value;
                break;
        }
        return key;
    }, [dataSource]);

    return (
        <View style={[style.container]}>
            <FlatList
                numColumns={3}
                data={selectedOptions}
                initialNumToRender={3}
                renderItem={renderItem}
                keyExtractor={extractKey}
            />

        </View>

    // </>
    );
};

export default SelectedOptions;
