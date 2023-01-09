// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {PostPriorityColors, PostPriorityType} from '@constants/post';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import PostPriorityPickerItem from './post_priority_picker_item';

type Props = {
    data: PostPriorityData;
    onSubmit: (data: PostPriorityData) => void;
};

export const COMPONENT_HEIGHT = 200;

const getStyle = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        height: 200,
    },
    titleContainer: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
    betaContainer: {
        backgroundColor: PostPriorityColors.IMPORTANT,
        borderRadius: 4,
        paddingHorizontal: 4,
        marginLeft: 8,
    },
    beta: {
        color: '#fff',
        ...typography('Body', 25, 'SemiBold'),
    },

    optionsContainer: {
        paddingVertical: 12,
    },
}));

const PostPriorityPicker = ({data, onSubmit}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const style = getStyle(theme);

    // For now, we just have one option but the spec suggest we have more in the next phase
    // const [data, setData] = React.useState<PostPriorityData>(defaultData);

    const handleUpdatePriority = React.useCallback((priority: PostPriorityData['priority']) => {
        onSubmit({priority: priority || ''});
    }, [onSubmit]);

    return (
        <View style={style.container}>
            {!isTablet &&
                <View style={style.titleContainer}>
                    <FormattedText
                        id='post_priority.picker.title'
                        defaultMessage='Message priority'
                        style={style.title}
                    />
                    <View style={style.betaContainer}>
                        <FormattedText
                            id='post_priority.picker.beta'
                            defaultMessage='BETA'
                            style={style.beta}
                        />
                    </View>
                </View>
            }
            <View style={style.optionsContainer}>
                <PostPriorityPickerItem
                    action={handleUpdatePriority}
                    icon='message-text-outline'
                    label={intl.formatMessage({
                        id: 'post_priority.picker.label.standard',
                        defaultMessage: 'Standard',
                    })}
                    selected={data.priority === ''}
                    value={PostPriorityType.STANDARD}
                />
                <PostPriorityPickerItem
                    action={handleUpdatePriority}
                    icon='alert-circle-outline'
                    iconColor={PostPriorityColors.IMPORTANT}
                    label={intl.formatMessage({
                        id: 'post_priority.picker.label.important',
                        defaultMessage: 'Important',
                    })}
                    selected={data.priority === PostPriorityType.IMPORTANT}
                    value={PostPriorityType.IMPORTANT}
                />
                <PostPriorityPickerItem
                    action={handleUpdatePriority}
                    icon='alert-outline'
                    iconColor={PostPriorityColors.URGENT}
                    label={intl.formatMessage({
                        id: 'post_priority.picker.label.urgent',
                        defaultMessage: 'Urgent',
                    })}
                    selected={data.priority === PostPriorityType.URGENT}
                    value={PostPriorityType.URGENT}
                />
            </View>
        </View>
    );
};

export default PostPriorityPicker;
