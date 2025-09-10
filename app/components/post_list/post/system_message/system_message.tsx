// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, type IntlShape, useIntl} from 'react-intl';
import {type StyleProp, Text, type TextStyle, View, type ViewStyle} from 'react-native';

import Markdown from '@components/markdown';
import {postTypeMessages} from '@components/post_list/combined_user_activity/messages';
import {Post} from '@constants';
import {useTheme} from '@context/theme';
import {getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord, ensureString} from '@utils/types';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';
import type {PrimitiveType} from 'intl-messageformat';

type SystemMessageProps = {
    author?: UserModel;
    location: AvailableScreens;
    post: PostModel;
}

type RenderersProps = SystemMessageProps & {
    intl: IntlShape;
    styles: {
        containerStyle: StyleProp<ViewStyle>;
        messageStyle: StyleProp<TextStyle>;
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
        container: {
            marginBottom: 5,
        },
        systemMessage: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            ...typography('Body', 200, 'Regular'),
        },
    };
});

const renderUsername = (value = '') => {
    if (value) {
        return (value[0] === '@') ? value : `@${value}`;
    }

    return value;
};

const renderMessage = ({location, post, styles, intl, localeHolder, theme, values, skipMarkdown = false}: RenderMessageProps) => {
    const {containerStyle, messageStyle, textStyles} = styles;

    if (skipMarkdown) {
        return (
            <Text style={messageStyle}>
                {intl.formatMessage(localeHolder, values)}
            </Text>
        );
    }

    return (
        <View style={containerStyle}>
            <Markdown
                baseTextStyle={messageStyle}
                channelId={post.channelId}
                disableGallery={true}
                location={location}
                textStyles={textStyles}
                value={intl.formatMessage(localeHolder, values)}
                theme={theme}
            />
        </View>
    );
};

const headerMessages = defineMessages({
    updatedFrom: {
        id: 'mobile.system_message.update_channel_header_message_and_forget.updated_from',
        defaultMessage: '{username} updated the channel header from: {oldHeader} to: {newHeader}',
    },
    updatedTo: {
        id: 'mobile.system_message.update_channel_header_message_and_forget.updated_to',
        defaultMessage: '{username} updated the channel header to: {newHeader}',
    },
    removed: {
        id: 'mobile.system_message.update_channel_header_message_and_forget.removed',
        defaultMessage: '{username} removed the channel header (was: {oldHeader})',
    },
});

const renderHeaderChangeMessage = ({post, author, location, styles, intl, theme}: RenderersProps) => {
    let values;

    if (!author?.username) {
        return null;
    }

    const username = renderUsername(author.username);
    const oldHeader = ensureString(post.props?.old_header);
    const newHeader = ensureString(post.props?.new_header);
    let localeHolder;

    if (post.props?.new_header) {
        if (post.props?.old_header) {
            localeHolder = headerMessages.updatedFrom;

            values = {username, oldHeader, newHeader};
            return renderMessage({post, styles, intl, location, localeHolder, values, theme});
        }

        localeHolder = headerMessages.updatedTo;

        values = {username, oldHeader, newHeader};
        return renderMessage({post, styles, intl, location, localeHolder, values, theme});
    } else if (post.props?.old_header) {
        localeHolder = headerMessages.removed;

        values = {username, oldHeader, newHeader};
        return renderMessage({post, styles, intl, location, localeHolder, values, theme});
    }

    return null;
};

const purposeMessages = defineMessages({
    updatedFrom: {
        id: 'mobile.system_message.update_channel_purpose_message.updated_from',
        defaultMessage: '{username} updated the channel purpose from: {oldPurpose} to: {newPurpose}',
    },
    updatedTo: {
        id: 'mobile.system_message.update_channel_purpose_message.updated_to',
        defaultMessage: '{username} updated the channel purpose to: {newPurpose}',
    },
    removed: {
        id: 'mobile.system_message.update_channel_purpose_message.removed',
        defaultMessage: '{username} removed the channel purpose (was: {oldPurpose})',
    },
});

const renderPurposeChangeMessage = ({post, author, location, styles, intl, theme}: RenderersProps) => {
    let values;

    if (!author?.username) {
        return null;
    }

    const username = renderUsername(author.username);
    const oldPurpose = ensureString(post.props?.old_purpose);
    const newPurpose = ensureString(post.props?.new_purpose);
    let localeHolder;

    if (newPurpose) {
        if (oldPurpose) {
            localeHolder = purposeMessages.updatedFrom;

            values = {username, oldPurpose, newPurpose};
            return renderMessage({post, styles, intl, location, localeHolder, values, skipMarkdown: true, theme});
        }

        localeHolder = purposeMessages.updatedTo;

        values = {username, oldPurpose, newPurpose};
        return renderMessage({post, styles, intl, location, localeHolder, values, skipMarkdown: true, theme});
    } else if (oldPurpose) {
        localeHolder = purposeMessages.removed;

        values = {username, oldPurpose, newPurpose};
        return renderMessage({post, styles, intl, location, localeHolder, values, skipMarkdown: true, theme});
    }

    return null;
};

const displaynameMessages = defineMessages({
    updatedFrom: {
        id: 'mobile.system_message.update_channel_displayname_message_and_forget.updated_from',
        defaultMessage: '{username} updated the channel display name from: {oldDisplayName} to: {newDisplayName}',
    },
});

const renderDisplayNameChangeMessage = ({post, author, location, styles, intl, theme}: RenderersProps) => {
    const oldDisplayName = ensureString(post.props?.old_displayname);
    const newDisplayName = ensureString(post.props?.new_displayname);

    if (!(author?.username)) {
        return null;
    }

    const username = renderUsername(author.username);
    const localeHolder = displaynameMessages.updatedFrom;

    const values = {username, oldDisplayName, newDisplayName};
    return renderMessage({post, styles, intl, location, localeHolder, values, theme});
};

const archivedMessages = defineMessages({
    archived: {
        id: 'mobile.system_message.channel_archived_message',
        defaultMessage: '{username} archived the channel',
    },
});

const renderArchivedMessage = ({post, author, location, styles, intl, theme}: RenderersProps) => {
    const username = renderUsername(author?.username);
    const localeHolder = archivedMessages.archived;

    const values = {username};
    return renderMessage({post, styles, intl, location, localeHolder, values, theme});
};

const unarchivedMessages = defineMessages({
    unarchived: {
        id: 'mobile.system_message.channel_unarchived_message',
        defaultMessage: '{username} unarchived the channel',
    },
});

const renderUnarchivedMessage = ({post, author, location, styles, intl, theme}: RenderersProps) => {
    if (!author?.username) {
        return null;
    }

    const username = renderUsername(author.username);
    const localeHolder = unarchivedMessages.unarchived;

    const values = {username};
    return renderMessage({post, styles, intl, location, localeHolder, values, theme});
};

const addGuestToChannelMessages = defineMessages({
    added: {
        id: 'api.channel.add_guest.added',
        defaultMessage: '{addedUsername} added to the channel as a guest by {username}.',
    },
});

const renderAddGuestToChannelMessage = ({post, location, styles, intl, theme}: RenderersProps, hideGuestTags: boolean) => {
    const username = renderUsername(ensureString(post.props?.username));
    const addedUsername = renderUsername(ensureString(post.props?.addedUsername));

    if (!username || !addedUsername) {
        return null;
    }

    const localeHolder = hideGuestTags ? postTypeMessages[Post.POST_TYPES.ADD_TO_CHANNEL].one : addGuestToChannelMessages.added;

    const values = hideGuestTags ? {firstUser: addedUsername, actor: username} : {username, addedUsername};
    return renderMessage({post, styles, intl, location, localeHolder, values, theme});
};

const guestJoinChannelMessages = defineMessages({
    joined: {
        id: 'api.channel.guest_join_channel.post_and_forget',
        defaultMessage: '{username} joined the channel as a guest.',
    },
});

const renderGuestJoinChannelMessage = ({post, styles, location, intl, theme}: RenderersProps, hideGuestTags: boolean) => {
    const username = renderUsername(ensureString(post.props?.username));
    if (!username) {
        return null;
    }

    const localeHolder = hideGuestTags ? postTypeMessages[Post.POST_TYPES.JOIN_CHANNEL].one : guestJoinChannelMessages.joined;

    const values = hideGuestTags ? {firstUser: username} : {username};
    return renderMessage({post, styles, intl, location, localeHolder, values, theme});
};

const systemMessageRenderers = {
    [Post.POST_TYPES.HEADER_CHANGE]: renderHeaderChangeMessage,
    [Post.POST_TYPES.DISPLAYNAME_CHANGE]: renderDisplayNameChangeMessage,
    [Post.POST_TYPES.PURPOSE_CHANGE]: renderPurposeChangeMessage,
    [Post.POST_TYPES.CHANNEL_DELETED]: renderArchivedMessage,
    [Post.POST_TYPES.CHANNEL_UNARCHIVED]: renderUnarchivedMessage,
};

export const SystemMessage = ({post, location, author, hideGuestTags}: SystemMessageProps & { hideGuestTags: boolean}) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const styles = {messageStyle: style.systemMessage, textStyles, containerStyle: style.container};

    if (post.type === Post.POST_TYPES.GUEST_JOIN_CHANNEL) {
        return renderGuestJoinChannelMessage({post, author, location, styles, intl, theme}, hideGuestTags);
    }
    if (post.type === Post.POST_TYPES.ADD_GUEST_TO_CHANNEL) {
        return renderAddGuestToChannelMessage({post, author, location, styles, intl, theme}, hideGuestTags);
    }

    const renderer = secureGetFromRecord(systemMessageRenderers, post.type);
    if (!renderer) {
        return (
            <Markdown
                baseTextStyle={styles.messageStyle}
                channelId={post.channelId}
                location={location}
                disableGallery={true}
                textStyles={styles.textStyles}
                value={post.message}
                theme={theme}
            />
        );
    }

    return renderer({post, author, location, styles, intl, theme});
};

export default SystemMessage;
