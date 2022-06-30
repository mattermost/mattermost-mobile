// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type ShowMoreButtonProps = {
    onPress: () => void;
    showMore: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        showMore: {
            color: theme.buttonBg,
            paddingLeft: 20,
            ...typography('Body', 200, 'SemiBold'),
        },
    };
});

const ShowMoreButton = ({onPress, showMore}: ShowMoreButtonProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let id = t('mobile.search.show_more');
    let defaultMessage = 'Show more';
    if (showMore) {
        id = t('mobile.search.show_less');
        defaultMessage = 'Show less';
    }

    return (
        <MenuItem
            testID={'mobile.search.show_more'}
            onPress={onPress}
            labelComponent={
                <FormattedText
                    id={id}
                    defaultMessage={defaultMessage}
                    style={style.showMore}
                />
            }
            separator={false}
            theme={theme}
        />
    );
};

export default ShowMoreButton;

