// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {StyleProp, Text, TextStyle, ViewStyle} from 'react-native';

import Markdown from '@components/markdown';
import {Post} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {PrimitiveType} from 'intl-messageformat';

type SystemMessageProps = {
    author?: UserModel;
    post: PostModel;
}

type RenderersProps = SystemMessageProps & {
    intl: IntlShape;
    styles: {
        messageStyle: StyleProp<ViewStyle>;
        textStyles: {
            [key: string]: TextStyle;
        };
    };
    theme: Theme;
}

type RenderMessageProps = RenderersProps & {
    localeHolder: {
        id: string;
        defaultMessage: string;
    };
    skipMarkdown?: boolean;
    values: Record<string, PrimitiveType>;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        systemMessage: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 16,
            lineHeight: 20,
        },
    };
});

const renderUsername = (value = '') => {
    if (value) {
        return (value[0] === '@') ? value : `@${value}`;
    }

    return value;
};

const renderMessage = ({styles, intl, localeHolder, theme, values, skipMarkdown = false}: RenderMessageProps) => {
    const {messageStyle, textStyles} = styles;

    if (skipMarkdown) {
        return (
            <Text style={messageStyle}>
                {intl.formatMessage(localeHolder, values)}
            </Text>
        );
    }

    return (
        <Markdown
            baseTextStyle={messageStyle}
            disableGallery={true}
            textStyles={textStyles}
            value={intl.formatMessage(localeHolder, values)}
            theme={theme}
        />
    );
};

const renderHeaderChangeMessage = ({post, author, styles, intl, theme}: RenderersProps) => {
    let values;

    if (!author?.username) {
        return null;
    }

    const username = renderUsername(author.username);
    const oldHeader = post.props?.old_header;
    const newHeader = post.props?.new_header;
    let localeHolder;

    if (post.props?.new_header) {
        if (post.props?.old_header) {
            localeHolder = {
                id: t('mobile.system_message.update_channel_header_message_and_forget.updated_from'),
                defaultMessage: '{username} updated the channel header from: {oldHeader} to: {newHeader}',
            };

            values = {username, oldHeader, newHeader};
            return renderMessage({post, styles, intl, localeHolder, values, theme});
        }

        localeHolder = {
            id: t('mobile.system_message.update_channel_header_message_and_forget.updated_to'),
            defaultMessage: '{username} updated the channel header to: {newHeader}',
        };

        values = {username, oldHeader, newHeader};
        return renderMessage({post, styles, intl, localeHolder, values, theme});
    } else if (post.props?.old_header) {
        localeHolder = {
            id: t('mobile.system_message.update_channel_header_message_and_forget.removed'),
            defaultMessage: '{username} removed the channel header (was: {oldHeader})',
        };

        values = {username, oldHeader, newHeader};
        return renderMessage({post, styles, intl, localeHolder, values, theme});
    }

    return null;
};

const renderPurposeChangeMessage = ({post, author, styles, intl, theme}: RenderersProps) => {
    let values;

    if (!author?.username) {
        return null;
    }

    const username = renderUsername(author.username);
    const oldPurpose = post.props?.old_purpose;
    const newPurpose = post.props?.new_purpose;
    let localeHolder;

    if (post.props?.new_purpose) {
        if (post.props?.old_purpose) {
            localeHolder = {
                id: t('mobile.system_message.update_channel_purpose_message.updated_from'),
                defaultMessage: '{username} updated the channel purpose from: {oldPurpose} to: {newPurpose}',
            };

            values = {username, oldPurpose, newPurpose};
            return renderMessage({post, styles, intl, localeHolder, values, skipMarkdown: true, theme});
        }

        localeHolder = {
            id: t('mobile.system_message.update_channel_purpose_message.updated_to'),
            defaultMessage: '{username} updated the channel purpose to: {newPurpose}',
        };

        values = {username, oldPurpose, newPurpose};
        return renderMessage({post, styles, intl, localeHolder, values, skipMarkdown: true, theme});
    } else if (post.props?.old_purpose) {
        localeHolder = {
            id: t('mobile.system_message.update_channel_purpose_message.removed'),
            defaultMessage: '{username} removed the channel purpose (was: {oldPurpose})',
        };

        values = {username, oldPurpose, newPurpose};
        return renderMessage({post, styles, intl, localeHolder, values, skipMarkdown: true, theme});
    }

    return null;
};

const renderDisplayNameChangeMessage = ({post, author, styles, intl, theme}: RenderersProps) => {
    const oldDisplayName = post.props?.old_displayname;
    const newDisplayName = post.props?.new_displayname;

    if (!(author?.username)) {
        return null;
    }

    const username = renderUsername(author.username);
    const localeHolder = {
        id: t('mobile.system_message.update_channel_displayname_message_and_forget.updated_from'),
        defaultMessage: '{username} updated the channel display name from: {oldDisplayName} to: {newDisplayName}',
    };

    const values = {username, oldDisplayName, newDisplayName};
    return renderMessage({post, styles, intl, localeHolder, values, theme});
};

const renderArchivedMessage = ({post, author, styles, intl, theme}: RenderersProps) => {
    const username = renderUsername(author?.username);
    const localeHolder = {
        id: t('mobile.system_message.channel_archived_message'),
        defaultMessage: '{username} archived the channel',
    };

    const values = {username};
    return renderMessage({post, styles, intl, localeHolder, values, theme});
};

const renderUnarchivedMessage = ({post, author, styles, intl, theme}: RenderersProps) => {
    if (!author?.username) {
        return null;
    }

    const username = renderUsername(author.username);
    const localeHolder = {
        id: t('mobile.system_message.channel_unarchived_message'),
        defaultMessage: '{username} unarchived the channel',
    };

    const values = {username};
    return renderMessage({post, styles, intl, localeHolder, values, theme});
};

const renderAddGuestToChannelMessage = ({post, styles, intl, theme}: RenderersProps) => {
    if (!post.props.username || !post.props.addedUsername) {
        return null;
    }

    const username = renderUsername(post.props.username);
    const addedUsername = renderUsername(post.props.addedUsername);

    const localeHolder = {
        id: t('api.channel.add_guest.added'),
        defaultMessage: '{addedUsername} added to the channel as a guest by {username}.',
    };

    const values = {username, addedUsername};
    return renderMessage({post, styles, intl, localeHolder, values, theme});
};

const renderGuestJoinChannelMessage = ({post, styles, intl, theme}: RenderersProps) => {
    if (!post.props.username) {
        return null;
    }

    const username = renderUsername(post.props.username);
    const localeHolder = {
        id: t('api.channel.guest_join_channel.post_and_forget'),
        defaultMessage: '{username} joined the channel as a guest.',
    };

    const values = {username};
    return renderMessage({post, styles, intl, localeHolder, values, theme});
};

const systemMessageRenderers = {
    [Post.POST_TYPES.HEADER_CHANGE]: renderHeaderChangeMessage,
    [Post.POST_TYPES.DISPLAYNAME_CHANGE]: renderDisplayNameChangeMessage,
    [Post.POST_TYPES.PURPOSE_CHANGE]: renderPurposeChangeMessage,
    [Post.POST_TYPES.CHANNEL_DELETED]: renderArchivedMessage,
    [Post.POST_TYPES.CHANNEL_UNARCHIVED]: renderUnarchivedMessage,
    [Post.POST_TYPES.GUEST_JOIN_CHANNEL]: renderGuestJoinChannelMessage,
    [Post.POST_TYPES.ADD_GUEST_TO_CHANNEL]: renderAddGuestToChannelMessage,
};

export const SystemMessage = ({post, author}: SystemMessageProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const renderer = systemMessageRenderers[post.type];
    if (!renderer) {
        return null;
    }
    const style = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const styles = {messageStyle: style.systemMessage, textStyles};
    return renderer({post, author, styles, intl, theme});
};

export default React.memo(SystemMessage);
