// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {intlShape, injectIntl} from 'react-intl';
import {StyleProp, Text, ViewStyle} from 'react-native';

import Markdown from '@components/markdown';
import {Posts} from '@mm-redux/constants';
import {t} from '@utils/i18n';
import {getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/preferences';

type SystemMessageProps = {
    intl: typeof intlShape;
    post: Post;
    ownerUsername?: string;
    theme: Theme;
}

type RenderersProps = Omit<SystemMessageProps, 'theme'> & {
    styles: {
        messageStyle: StyleProp<ViewStyle>;
        textStyles: StyleProp<ViewStyle>;
    };
}

type RenderMessageProps = RenderersProps & {
    localeHolder: {
        id: string;
        defaultMessage: string;
    };
    skipMarkdown?: boolean;
    values: Record<string, any>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        systemMessage: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 15,
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

const renderMessage = ({styles, intl, localeHolder, values, skipMarkdown = false}: RenderMessageProps) => {
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
            baseTextStyle={messageStyle as any}
            disableAtChannelMentionHighlight={true}
            disableGallery={true}
            textStyles={textStyles as any}
            value={intl.formatMessage(localeHolder, values)}
        />
    );
};

const renderHeaderChangeMessage = ({post, ownerUsername, styles, intl}: RenderersProps) => {
    let values;

    if (!ownerUsername) {
        return null;
    }

    const username = renderUsername(ownerUsername);
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
            return renderMessage({post, styles, intl, localeHolder, values});
        }

        localeHolder = {
            id: t('mobile.system_message.update_channel_header_message_and_forget.updated_to'),
            defaultMessage: '{username} updated the channel header to: {newHeader}',
        };

        values = {username, oldHeader, newHeader};
        return renderMessage({post, styles, intl, localeHolder, values});
    } else if (post.props?.old_header) {
        localeHolder = {
            id: t('mobile.system_message.update_channel_header_message_and_forget.removed'),
            defaultMessage: '{username} removed the channel header (was: {oldHeader})',
        };

        values = {username, oldHeader, newHeader};
        return renderMessage({post, styles, intl, localeHolder, values});
    }

    return null;
};

const renderPurposeChangeMessage = ({post, ownerUsername, styles, intl}: RenderersProps) => {
    let values;

    if (!ownerUsername) {
        return null;
    }

    const username = renderUsername(ownerUsername);
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
            return renderMessage({post, styles, intl, localeHolder, values, skipMarkdown: true});
        }

        localeHolder = {
            id: t('mobile.system_message.update_channel_purpose_message.updated_to'),
            defaultMessage: '{username} updated the channel purpose to: {newPurpose}',
        };

        values = {username, oldPurpose, newPurpose};
        return renderMessage({post, styles, intl, localeHolder, values, skipMarkdown: true});
    } else if (post.props?.old_purpose) {
        localeHolder = {
            id: t('mobile.system_message.update_channel_purpose_message.removed'),
            defaultMessage: '{username} removed the channel purpose (was: {oldPurpose})',
        };

        values = {username, oldPurpose, newPurpose};
        return renderMessage({post, styles, intl, localeHolder, values, skipMarkdown: true});
    }

    return null;
};

const renderDisplayNameChangeMessage = ({post, ownerUsername, styles, intl}: RenderersProps) => {
    const oldDisplayName = post.props?.old_displayname;
    const newDisplayName = post.props?.new_displayname;

    if (!(ownerUsername)) {
        return null;
    }

    const username = renderUsername(ownerUsername);
    const localeHolder = {
        id: t('mobile.system_message.update_channel_displayname_message_and_forget.updated_from'),
        defaultMessage: '{username} updated the channel display name from: {oldDisplayName} to: {newDisplayName}',
    };

    const values = {username, oldDisplayName, newDisplayName};
    return renderMessage({post, styles, intl, localeHolder, values});
};

const renderArchivedMessage = ({post, ownerUsername, styles, intl}: RenderersProps) => {
    const username = renderUsername(ownerUsername);
    const localeHolder = {
        id: t('mobile.system_message.channel_archived_message'),
        defaultMessage: '{username} archived the channel',
    };

    const values = {username};
    return renderMessage({post, styles, intl, localeHolder, values});
};

const renderUnarchivedMessage = ({post, ownerUsername, styles, intl}: RenderersProps) => {
    if (!ownerUsername) {
        return null;
    }

    const username = renderUsername(ownerUsername);
    const localeHolder = {
        id: t('mobile.system_message.channel_unarchived_message'),
        defaultMessage: '{username} unarchived the channel',
    };

    const values = {username};
    return renderMessage({post, styles, intl, localeHolder, values});
};

const systemMessageRenderers = {
    [Posts.POST_TYPES.HEADER_CHANGE]: renderHeaderChangeMessage,
    [Posts.POST_TYPES.DISPLAYNAME_CHANGE]: renderDisplayNameChangeMessage,
    [Posts.POST_TYPES.PURPOSE_CHANGE]: renderPurposeChangeMessage,
    [Posts.POST_TYPES.CHANNEL_DELETED]: renderArchivedMessage,
    [Posts.POST_TYPES.CHANNEL_UNARCHIVED]: renderUnarchivedMessage,
};

const SystemMessage = ({post, ownerUsername, theme, intl}: SystemMessageProps) => {
    const renderer = systemMessageRenderers[post.type];
    if (!renderer) {
        return null;
    }
    const style = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const styles = {messageStyle: style.systemMessage, textStyles};
    return renderer({post, ownerUsername, styles, intl});
};

export default injectIntl(SystemMessage);
