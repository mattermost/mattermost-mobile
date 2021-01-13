// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';
import {Posts} from '@mm-redux/constants';
import Markdown from 'app/components/markdown';
import {t} from 'app/utils/i18n';

const renderUsername = (value = '') => {
    if (value) {
        return (value[0] === '@') ? value : `@${value}`;
    }

    return value;
};

const renderMessage = (postBodyProps, styles, intl, localeHolder, values, skipMarkdown = false) => {
    const {onPress, onPermalinkPress} = postBodyProps;
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
            disableAtChannelMentionHighlight={true}
            disableGallery={true}
            onPostPress={onPress}
            onPermalinkPress={onPermalinkPress}
            textStyles={textStyles}
            value={intl.formatMessage(localeHolder, values)}
        />
    );
};

const renderHeaderChangeMessage = (postBodyProps, styles, intl) => {
    const {postProps} = postBodyProps;
    let values;

    if (!postProps.username) {
        return null;
    }

    const username = renderUsername(postProps.username);
    const oldHeader = postProps.old_header;
    const newHeader = postProps.new_header;
    let localeHolder;

    if (postProps.new_header) {
        if (postProps.old_header) {
            localeHolder = {
                id: t('mobile.system_message.update_channel_header_message_and_forget.updated_from'),
                defaultMessage: '{username} updated the channel header from: {oldHeader} to: {newHeader}',
            };

            values = {username, oldHeader, newHeader};
            return renderMessage(postBodyProps, styles, intl, localeHolder, values);
        }

        localeHolder = {
            id: t('mobile.system_message.update_channel_header_message_and_forget.updated_to'),
            defaultMessage: '{username} updated the channel header to: {newHeader}',
        };

        values = {username, oldHeader, newHeader};
        return renderMessage(postBodyProps, styles, intl, localeHolder, values);
    } else if (postProps.old_header) {
        localeHolder = {
            id: t('mobile.system_message.update_channel_header_message_and_forget.removed'),
            defaultMessage: '{username} removed the channel header (was: {oldHeader})',
        };

        values = {username, oldHeader, newHeader};
        return renderMessage(postBodyProps, styles, intl, localeHolder, values);
    }

    return null;
};

const renderPurposeChangeMessage = (postBodyProps, styles, intl) => {
    const {postProps} = postBodyProps;
    let values;

    if (!postProps.username) {
        return null;
    }

    const username = renderUsername(postProps.username);
    const oldPurpose = postProps.old_purpose;
    const newPurpose = postProps.new_purpose;
    let localeHolder;

    if (postProps.new_purpose) {
        if (postProps.old_purpose) {
            localeHolder = {
                id: t('mobile.system_message.update_channel_purpose_message.updated_from'),
                defaultMessage: '{username} updated the channel purpose from: {oldPurpose} to: {newPurpose}',
            };

            values = {username, oldPurpose, newPurpose};
            return renderMessage(postBodyProps, styles, intl, localeHolder, values, true);
        }

        localeHolder = {
            id: t('mobile.system_message.update_channel_purpose_message.updated_to'),
            defaultMessage: '{username} updated the channel purpose to: {newPurpose}',
        };

        values = {username, oldPurpose, newPurpose};
        return renderMessage(postBodyProps, styles, intl, localeHolder, values, true);
    } else if (postProps.old_purpose) {
        localeHolder = {
            id: t('mobile.system_message.update_channel_purpose_message.removed'),
            defaultMessage: '{username} removed the channel purpose (was: {oldPurpose})',
        };

        values = {username, oldPurpose, newPurpose};
        return renderMessage(postBodyProps, styles, intl, localeHolder, values, true);
    }

    return null;
};

const renderDisplayNameChangeMessage = (postBodyProps, styles, intl) => {
    const {postProps} = postBodyProps;
    const oldDisplayName = postProps.old_displayname;
    const newDisplayName = postProps.new_displayname;

    if (!(postProps.username && postProps.old_displayname && postProps.new_displayname)) {
        return null;
    }

    const username = renderUsername(postProps.username);
    const localeHolder = {
        id: t('mobile.system_message.update_channel_displayname_message_and_forget.updated_from'),
        defaultMessage: '{username} updated the channel display name from: {oldDisplayName} to: {newDisplayName}',
    };

    const values = {username, oldDisplayName, newDisplayName};
    return renderMessage(postBodyProps, styles, intl, localeHolder, values);
};

const renderArchivedMessage = (postBodyProps, styles, intl) => {
    const {postProps} = postBodyProps;

    const username = renderUsername(postProps.username);
    const localeHolder = {
        id: t('mobile.system_message.channel_archived_message'),
        defaultMessage: '{username} archived the channel',
    };

    const values = {username};
    return renderMessage(postBodyProps, styles, intl, localeHolder, values);
};

const renderUnarchivedMessage = (postBodyProps, styles, intl) => {
    const {postProps} = postBodyProps;
    if (!postProps?.username) {
        return null;
    }

    const username = renderUsername(postProps.username);
    const localeHolder = {
        id: t('mobile.system_message.channel_unarchived_message'),
        defaultMessage: '{username} unarchived the channel',
    };

    const values = {username};
    return renderMessage(postBodyProps, styles, intl, localeHolder, values);
};

const systemMessageRenderers = {
    [Posts.POST_TYPES.HEADER_CHANGE]: renderHeaderChangeMessage,
    [Posts.POST_TYPES.DISPLAYNAME_CHANGE]: renderDisplayNameChangeMessage,
    [Posts.POST_TYPES.PURPOSE_CHANGE]: renderPurposeChangeMessage,
    [Posts.POST_TYPES.CHANNEL_DELETED]: renderArchivedMessage,
    [Posts.POST_TYPES.CHANNEL_UNARCHIVED]: renderUnarchivedMessage,
};

export const renderSystemMessage = (postBodyProps, styles, intl) => {
    const renderer = systemMessageRenderers[postBodyProps.postType];
    if (!renderer) {
        return null;
    }
    return renderer(postBodyProps, styles, intl);
};
