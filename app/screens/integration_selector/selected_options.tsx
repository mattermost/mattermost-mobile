// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import { View, ScrollView } from 'react-native';

import { View as ViewConstants } from '@constants';
import { makeStyleSheetFromTheme } from '@utils/theme';

import SelectedOption from './selected_option';


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

const SelectedOptions = (props: Props, ref: React.Ref<ScrollView>) => {
    const { theme, selectedOptions, onRemove, dataSource } = props;
    const options: React.ReactNode[] = [];

    for (const option of selectedOptions) {
        let key: string;
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                key = (option as UserProfile).id;
                break;
            case ViewConstants.DATA_SOURCE_CHANNELS:
                key = (option as Channel).id;
                break;
            default:
                key = (option as DialogOption).value;
                break;
        }
        options.push(
            <SelectedOption
                key={key}
                option={option}
                theme={theme}
                dataSource={dataSource}
                onRemove={onRemove}
            />,
        );
    }

    if (options.length === 0) {
        return null;
    }

    const style = getStyleFromTheme(theme);

    return (
        <ScrollView
            ref={ref}
            style={style.container}
            contentContainerStyle={style.scrollViewContent}
        >
            <View style={style.users} >
                {options}
            </View>
        </ScrollView>
    );
}

export default SelectedOptions;
