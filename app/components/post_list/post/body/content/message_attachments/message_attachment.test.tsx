// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import Preferences from '@constants/preferences';

// Mock the child components to focus on testing Boolean checks
const mockAttachmentThumbnail = jest.fn().mockReturnValue(null);
jest.mock('./attachment_thumbnail', () => {
    return function MockAttachmentThumbnail(props: {uri: string}) {
        mockAttachmentThumbnail(props);
        return null;
    };
});

const mockAttachmentFields = jest.fn().mockReturnValue(null);
jest.mock('./attachment_fields', () => {
    return function MockAttachmentFields(props: {fields: MessageAttachmentField[]}) {
        mockAttachmentFields(props);
        return null;
    };
});

const mockAttachmentFooter = jest.fn().mockReturnValue(null);
jest.mock('./attachment_footer', () => {
    return function MockAttachmentFooter(props: {text: string; icon?: string; theme: Theme}) {
        mockAttachmentFooter(props);
        return null;
    };
});

const mockAttachmentActions = jest.fn().mockReturnValue(null);
jest.mock('./attachment_actions', () => {
    return function MockAttachmentActions(props: {actions: PostAction[]; postId: string; theme: Theme}) {
        mockAttachmentActions(props);
        return null;
    };
});

jest.mock('./attachment_author', () => {
    return function MockAttachmentAuthor() {
        return null;
    };
});

jest.mock('./attachment_image', () => {
    return function MockAttachmentImage() {
        return null;
    };
});

jest.mock('./attachment_pretext', () => {
    return function MockAttachmentPretext() {
        return null;
    };
});

jest.mock('./attachment_text', () => {
    return function MockAttachmentText() {
        return null;
    };
});

jest.mock('./attachment_title', () => {
    return function MockAttachmentTitle() {
        return null;
    };
});

// Mock the URL validation function
jest.mock('@utils/url', () => ({
    isValidUrl: jest.fn((url) => url === 'https://example.com/image.png'),
}));

import MessageAttachment from './message_attachment';

describe('MessageAttachment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const baseProps: ComponentProps<typeof MessageAttachment> = {
        attachment: {
            id: 1,
            text: 'This is the text of an attachment',
            thumb_url: 'https://example.com/image.png',
            author_name: 'Author Name',
            author_icon: 'https://example.com/author.png',
            title: 'Attachment Title',
            title_link: 'https://example.com',
            fields: [
                {
                    title: 'Field Title',
                    value: 'Field Value',
                    short: true,
                },
            ],
            actions: [
                {
                    id: 'action1',
                    name: 'Action 1',
                    type: 'button',
                    integration: {
                        url: 'https://example.com/action',
                    },
                },
            ],
            footer: 'Attachment Footer',
            footer_icon: 'https://example.com/footer.png',
            image_url: 'https://example.com/image.jpg',
        },
        channelId: 'channel-id',
        postId: 'post-id',
        location: 'Channel',
        theme: Preferences.THEMES.denim,
        metadata: {
            images: {
                'https://example.com/image.jpg': {
                    width: 200,
                    height: 200,
                    format: 'jpg',
                    frame_count: 0,
                },
            },
        },
    };

    test('it renders without crashing with full attachment data', () => {
        const wrapper = render(<MessageAttachment {...baseProps}/>);
        expect(wrapper.toJSON()).toBeTruthy();
    });

    test('it handles undefined thumb_url without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                ...baseProps.attachment,
                thumb_url: undefined,
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentThumbnail).not.toHaveBeenCalled();
    });

    test('it handles falsy thumb_url without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                ...baseProps.attachment,
                thumb_url: '',
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentThumbnail).not.toHaveBeenCalled();
    });

    test('it correctly passes non-null thumb_url to AttachmentThumbnail', () => {
        render(<MessageAttachment {...baseProps}/>);
        expect(mockAttachmentThumbnail).toHaveBeenCalledWith(
            expect.objectContaining({
                uri: 'https://example.com/image.png',
            }),
        );
    });

    test('it handles undefined fields without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                ...baseProps.attachment,
                fields: undefined,
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentFields).not.toHaveBeenCalled();
    });

    test('it handles empty fields array without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                ...baseProps.attachment,
                fields: [],
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentFields).not.toHaveBeenCalled();
    });

    test('it correctly passes non-null fields to AttachmentFields', () => {
        render(<MessageAttachment {...baseProps}/>);
        expect(mockAttachmentFields).toHaveBeenCalledWith(
            expect.objectContaining({
                fields: baseProps.attachment.fields,
            }),
        );
    });

    test('it handles undefined footer without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                ...baseProps.attachment,
                footer: undefined,
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentFooter).not.toHaveBeenCalled();
    });

    test('it handles falsy footer without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                ...baseProps.attachment,
                footer: '',
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentFooter).not.toHaveBeenCalled();
    });

    test('it correctly passes non-null footer to AttachmentFooter', () => {
        render(<MessageAttachment {...baseProps}/>);
        expect(mockAttachmentFooter).toHaveBeenCalledWith(
            expect.objectContaining({
                text: 'Attachment Footer',
            }),
        );
    });

    test('it handles undefined actions without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                ...baseProps.attachment,
                actions: undefined,
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentActions).not.toHaveBeenCalled();
    });

    test('it handles empty actions array without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                ...baseProps.attachment,
                actions: [],
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentActions).not.toHaveBeenCalled();
    });

    test('it correctly passes non-null actions to AttachmentActions', () => {
        render(<MessageAttachment {...baseProps}/>);
        expect(mockAttachmentActions).toHaveBeenCalledWith(
            expect.objectContaining({
                actions: baseProps.attachment.actions,
            }),
        );
    });

    test('it handles multiple undefined properties without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                id: 1,
                text: 'This is the text of an attachment with multiple undefined properties',
                thumb_url: undefined,
                fields: undefined,
                actions: undefined,
                footer: undefined,
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentThumbnail).not.toHaveBeenCalled();
        expect(mockAttachmentFields).not.toHaveBeenCalled();
        expect(mockAttachmentFooter).not.toHaveBeenCalled();
        expect(mockAttachmentActions).not.toHaveBeenCalled();
    });

    test('it handles mixed falsy properties without crashing', () => {
        const props = {
            ...baseProps,
            attachment: {
                id: 1,
                text: 'This is the text of an attachment with mixed falsy properties',
                thumb_url: '',
                fields: undefined,
                actions: [],
                footer: '',
            },
        };

        const wrapper = render(<MessageAttachment {...props}/>);
        expect(wrapper.toJSON()).toBeTruthy();
        expect(mockAttachmentThumbnail).not.toHaveBeenCalled();
        expect(mockAttachmentFields).not.toHaveBeenCalled();
        expect(mockAttachmentFooter).not.toHaveBeenCalled();
        expect(mockAttachmentActions).not.toHaveBeenCalled();
    });
});
