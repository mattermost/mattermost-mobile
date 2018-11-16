// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {t} from 'app/utils/i18n';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import flagIcon from 'assets/images/post_header/flag.png';
import pinIcon from 'assets/images/post_header/pin.png';

export default class PostPreHeader extends PureComponent {
    static propTypes = {
        isConsecutive: PropTypes.bool,
        isFlagged: PropTypes.bool,
        isPinned: PropTypes.bool,
        rightColumnStyle: PropTypes.array,
        skipFlaggedHeader: PropTypes.bool,
        skipPinnedHeader: PropTypes.bool,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const {
            isConsecutive,
            isFlagged,
            isPinned,
            rightColumnStyle,
            skipFlaggedHeader,
            skipPinnedHeader,
            theme,
        } = this.props;
        const isPinnedAndFlagged = isPinned && isFlagged && !skipFlaggedHeader && !skipPinnedHeader;

        const style = getStyleSheet(theme);
        let text;
        if (isPinnedAndFlagged) {
            text = {
                id: t('mobile.post_pre_header.pinned_flagged'),
                defaultMessage: 'Pinned and Flagged',
            };
        } else if (isPinned && !skipPinnedHeader) {
            text = {
                id: t('mobile.post_pre_header.pinned'),
                defaultMessage: 'Pinned',
            };
        } else if (isFlagged && !skipFlaggedHeader) {
            text = {
                id: t('mobile.post_pre_header.flagged'),
                defaultMessage: 'Flagged',
            };
        }

        if (!text) {
            return null;
        }

        return (
            <View style={[style.container, (isConsecutive && style.consecutive)]}>
                <View style={style.iconsContainer}>
                    {isPinned && !skipPinnedHeader &&
                    <Image
                        id='pinIcon'
                        source={pinIcon}
                        style={style.icon}
                    />
                    }
                    {isPinnedAndFlagged &&
                    <View style={style.iconsSeparator}/>
                    }
                    {isFlagged && !skipFlaggedHeader &&
                    <Image
                        id='flagIcon'
                        source={flagIcon}
                        style={style.icon}
                    />
                    }
                </View>
                <View style={[rightColumnStyle]}>
                    <FormattedText
                        {...text}
                        style={style.text}
                    />
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            height: 15,
            marginLeft: 12,
            marginRight: 10,
            marginTop: 10,
        },
        consecutive: {
            marginBottom: 3,
        },
        iconsContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginRight: 10,
            width: 35,
        },
        icon: {
            height: 11,
            tintColor: theme.linkColor,
            width: 11,
        },
        iconsSeparator: {
            marginRight: 5,
        },
        text: {
            color: theme.linkColor,
            fontSize: 13,
            lineHeight: 15,
        },
    };
});
