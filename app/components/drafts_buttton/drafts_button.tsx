// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import {switchToGlobalDrafts} from '@actions/local/draft';
import {HOME_PADDING} from '@app/constants/view';
import {useTheme} from '@app/context/theme';
import {useIsTablet} from '@app/hooks/device';
import {preventDoubleTap} from '@app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import Badge from '@components/badge';
import {
    getStyleSheet as getChannelItemStyleSheet,
    ROW_HEIGHT,
} from '@components/channel_item/channel_item';
import FormattedText from '@components/formatted_text';

import CompassIcon from '../compass_icon';

// See LICENSE.txt for license information.
type DraftListProps = {
    currentChannelId: string;
    shouldHighlighActive?: boolean;
    draftsCount: number;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    icon: {
        color: changeOpacity(theme.sidebarText, 0.5),
        fontSize: 24,
        marginRight: 12,
    },
    iconActive: {
        color: theme.sidebarText,
    },
    iconInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    text: {
        flex: 1,
    },
}));

const DraftsButton: React.FC<DraftListProps> = ({
    currentChannelId,
    shouldHighlighActive = false,
    draftsCount,
}) => {
    const theme = useTheme();
    const styles = getChannelItemStyleSheet(theme);
    const customStyles = getStyleSheet(theme);
    const isTablet = useIsTablet();

    const handlePress = useCallback(preventDoubleTap(() => {
        switchToGlobalDrafts();
    }), []);

    const isActive = isTablet && shouldHighlighActive && !currentChannelId;

    const [containerStyle, iconStyle, textStyle, badgeStyle] = useMemo(() => {
        const container = [
            styles.container,
            HOME_PADDING,
            isActive && styles.activeItem,
            isActive && {
                paddingLeft: HOME_PADDING.paddingLeft - styles.activeItem.borderLeftWidth,
            },
            {minHeight: ROW_HEIGHT},
        ];

        const icon = [
            customStyles.icon,
            isActive && customStyles.iconActive,
        ];

        const text = [
            customStyles.text,
            styles.text,
            isActive && styles.textActive,
        ];

        const badge = [
            styles.badge,
        ];

        return [container, icon, text, badge];
    }, [customStyles, isActive, styles]);

    if (!draftsCount) {
        return null;
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            testID='channel_list.drafts.button'
        >
            <View style={containerStyle}>
                <CompassIcon
                    name='pencil-outline'
                    style={iconStyle}
                />
                <FormattedText
                    id='drafts'
                    defaultMessage='Drafts'
                    style={textStyle}
                />
                <Badge
                    value={draftsCount}
                    style={badgeStyle}
                    visible={draftsCount > 0}
                />
            </View>
        </TouchableOpacity>
    );

    // const renderItem = ({item, index}: {item: string; index: number}) => (
    //     <View style={styles.itemContainer}>
    //         <Text style={styles.messageText}>{'Draft'} {index + 1} {':'} {item}</Text>
    //         <Text style={styles.fileText}>{'Attached files:'} {files[index]?.length || 0}</Text>
    //     </View>
    // );

    // return (
    //     <FlatList
    //         data={messages}
    //         keyExtractor={(item, index) => `draft-${index}`}
    //         renderItem={renderItem}
    //         ListEmptyComponent={<Text style={styles.emptyText}>{'No drafts available.'}</Text>}
    //     />
    // );
};

export default DraftsButton;
