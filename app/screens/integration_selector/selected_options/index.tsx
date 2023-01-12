// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, ScrollView} from 'react-native';

import {View as ViewConstants} from '@constants';
import {makeStyleSheetFromTheme} from '@utils/theme';

import SelectedOption from '../selected_option';

type Props = {
    theme: Theme;
    selectedOptions: DialogOption[] | UserProfile[] | Channel[];
    dataSource: string;
    onRemove: (opt: DialogOption | UserProfile | Channel) => void;
}

const getStyleFromTheme = makeStyleSheetFromTheme(() => {
    return {
        container: {
            marginLeft: 5,
            marginBottom: 5,
            maxHeight: 100,
            flexGrow: 0,
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
    const options: React.ReactNode[] = selectedOptions.map((optionItem) => {
        let key: string;

        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                key = (optionItem as UserProfile).id;
                break;
            case ViewConstants.DATA_SOURCE_CHANNELS:
                key = (optionItem as Channel).id;
                break;
            default:
                key = (optionItem as DialogOption).value;
                break;
        }

        return (
            <SelectedOption
                key={key}
                option={optionItem}
                theme={theme}
                dataSource={dataSource}
                onRemove={onRemove}
            />);
    });

    return (
        <ScrollView
            style={style.container}
        >
            <View style={style.users}>
                {options}
            </View>
        </ScrollView>
    );
};

export default SelectedOptions;
