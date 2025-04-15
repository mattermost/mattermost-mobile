// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const IMAGE_MAX_HEIGHT = 350;
export const IMAGE_MIN_DIMENSION = 50;
export const MAX_GIF_SIZE = 100 * 1024 * 1024;
export const VIEWPORT_IMAGE_OFFSET = 70;
export const VIEWPORT_IMAGE_REPLY_OFFSET = 11;
export const VIEWPORT_IMAGE_ATTACHMENT_OFFSET = 31.5; // (2 * 12) MessageAttachment Padding + (2,5 + 5) AttachmentImage Padding
export const MAX_RESOLUTION = 7680 * 4320; // 8K, ~33MPX

export default {
    IMAGE_MAX_HEIGHT,
    IMAGE_MIN_DIMENSION,
    MAX_GIF_SIZE,
    MAX_RESOLUTION,
    VIEWPORT_IMAGE_OFFSET,
    VIEWPORT_IMAGE_REPLY_OFFSET,
    VIEWPORT_IMAGE_ATTACHMENT_OFFSET,
};
