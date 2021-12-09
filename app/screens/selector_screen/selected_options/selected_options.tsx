// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, ScrollView} from 'react-native';

import {ViewTypes} from '@constants';
import {makeStyleSheetFromTheme} from '@utils/theme';

import SelectedOption from './selected_option';

import type {Channel} from '@mm-redux/types/channels';
import type {DialogOption} from '@mm-redux/types/integrations';
import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';

type Props = {
    theme: Theme;
    selectedOptions: DialogOption[]|UserProfile[]|Channel[];
    dataSource: string;
    onRemove: (opt: DialogOption|UserProfile|Channel) => void;
}

function SelectedOptions(props: Props, ref: React.Ref<ScrollView>) {
    const {theme, selectedOptions, onRemove, dataSource} = props;
    const options: React.ReactNode[] = [];

    for (const option of selectedOptions) {
        let key: string;
        switch (dataSource) {
        case ViewTypes.DATA_SOURCE_USERS:
            key = (option as UserProfile).id;
            break;
        case ViewTypes.DATA_SOURCE_CHANNELS:
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

export default React.forwardRef(SelectedOptions);

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
