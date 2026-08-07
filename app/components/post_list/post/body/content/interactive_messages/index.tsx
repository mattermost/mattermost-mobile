// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Entry point for the Interactive Messages framework.
//
// Reads a post's props, detects the payload format, runs the Translation Layer,
// and renders the result via the Block Renderer. Native mm_blocks / Block Kit /
// Adaptive Cards dispatch through doBlockAction; legacy attachments keep doPostAction.
// On servers without block actions (version or FeatureFlagMmBlocksEnabled), doBlockAction
// falls back to doPostActionWithCookie and form input blocks are omitted from the rendered tree.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View} from 'react-native';

import {handleGotoLocation} from '@actions/remote/command';
import {doBlockAction, postActionWithCookie} from '@actions/remote/integrations';
import {BlockRenderer, type ActionHandler, type LookupHandler} from '@components/block_renderer';
import {type MmBlocksFormErrors, type MmBlocksFormValues} from '@components/block_renderer/form';
import {stripMmBlocksFormInputs, validateMmBlocksFormValues} from '@components/block_renderer/form_validation';
import {getPostInteractiveIntegrationFormat, translatePostProps} from '@components/block_renderer/translation';
import {translateMMBlocks} from '@components/block_renderer/translation/mm_block';
import SectionNotice from '@components/section_notice';
import {useServerUrl} from '@context/server';
import IntegrationsManager from '@managers/integrations_manager';
import {observeBlockActionsEnabled} from '@queries/servers/features';
import {dismissMmBlocksExpandedContentIfOpen} from '@screens/navigation';
import {formatDialogFieldError} from '@utils/integrations';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {

    /** When false (block actions unavailable), form input blocks are not rendered. */
    blockActionsEnabled: boolean;
    channelId: string;
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
};

const messages = defineMessages({
    errorTitle: {id: 'interactive_dialog.error_title', defaultMessage: 'Error'},
    actionFailed: {id: 'post.message_attachment.action_failed', defaultMessage: 'An error occurred while executing the action.'},
    fixFieldErrors: {id: 'apps.error.form.required_fields_empty', defaultMessage: 'Please fix all field errors'},
    filesUploading: {id: 'interactive_dialog.files_uploading', defaultMessage: 'Please wait for file uploads to finish'},
});

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    actionError: {
        marginTop: 8,
    },
}));

function topLevelErrorMessage(data: DoBlockActionResponse | undefined): string | null {
    if (typeof data?.error === 'string' && data.error) {
        return data.error;
    }
    return null;
}

export const InteractiveMessages = ({blockActionsEnabled, channelId, location, post, theme}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const [actionError, setActionError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<MmBlocksFormErrors>({});
    const [blocksOverride, setBlocksOverride] = useState<MmBlock[] | null>(null);
    const [cookieOverride, setCookieOverride] = useState<string | undefined>(undefined);
    const [hasUploadingFields, setHasUploadingFields] = useState(false);
    const refreshRequestIdRef = useRef(0);

    // Remount counter for BlockRenderer/MmBlocksForm. Form values live in component state, so a
    // blocks refresh must remount (via key) to clear stale values and re-seed defaults.
    const [blocksEpoch, setBlocksEpoch] = useState(0);

    const props = post.props as Record<string, unknown> | undefined;
    const mmBlocksActionsProp = props?.mm_blocks_actions;
    const mmBlocksActionCookie = typeof mmBlocksActionsProp === 'string' ? mmBlocksActionsProp : undefined;
    const integrationFormat = getPostInteractiveIntegrationFormat(props ?? {});

    useEffect(() => {
        setBlocksOverride(null);
        setCookieOverride(undefined);
        setActionError(null);
        setFieldErrors({});
        setBlocksEpoch(0);
        refreshRequestIdRef.current = 0;
    }, [post.id, post.updateAt]);

    const effectiveCookie = cookieOverride ?? mmBlocksActionCookie;

    const blocks = useMemo(() => {
        const raw = blocksOverride ?? translatePostProps(props ?? {}, intl);
        if (!raw?.length) {
            return raw;
        }
        return blockActionsEnabled ? raw : stripMmBlocksFormInputs(raw);
    }, [blockActionsEnabled, blocksOverride, props, intl]);

    const inlineMarkdownActions = useMemo(() => {
        return {
            mmBlocksActionCookie: effectiveCookie,
            integrationFormat,
        };
    }, [effectiveCookie, integrationFormat]);

    const applyClientFormValidation = useCallback((formValues: MmBlocksFormValues): boolean => {
        if (!blocks) {
            return true;
        }

        const validationErrors = validateMmBlocksFormValues(blocks, formValues);
        const names = Object.keys(validationErrors);
        if (names.length === 0) {
            setFieldErrors({});
            return true;
        }

        const nextErrors: MmBlocksFormErrors = {};
        for (const name of names) {
            nextErrors[name] = formatDialogFieldError(intl, validationErrors[name]);
        }
        setFieldErrors(nextErrors);
        setActionError(intl.formatMessage(messages.fixFieldErrors));
        return false;
    }, [blocks, intl]);

    const handleAction: ActionHandler = useCallback(async ({
        actionId,
        selectedOption,
        query,
        attachmentCookie,
        formValues,
        subtype,
    }) => {
        const actionFailedMessage = intl.formatMessage(messages.actionFailed);
        setActionError(null);

        const isSubmit = subtype === 'submit';
        if (isSubmit) {
            // Block submit while uploads are in flight so file IDs make it into the form values.
            if (hasUploadingFields) {
                setActionError(intl.formatMessage(messages.filesUploading));
                return;
            }
            if (formValues && !applyClientFormValidation(formValues)) {
                return;
            }
        } else {
            setFieldErrors({});
        }

        // Sequence requests so a slow older response cannot overwrite a newer form.
        const requestId = ++refreshRequestIdRef.current;

        if (integrationFormat === 'attachment') {
            const {data, error} = await postActionWithCookie(
                serverUrl,
                post.id,
                actionId,
                attachmentCookie ?? '',
                selectedOption ?? '',
                query,
                integrationFormat,
            );
            if (requestId !== refreshRequestIdRef.current) {
                return;
            }
            if (error) {
                const message = error instanceof Error && error.message ? error.message : undefined;
                setActionError(message ?? actionFailedMessage);
                return;
            }
            setFieldErrors({});
            if (data?.goto_location) {
                handleGotoLocation(serverUrl, intl, data.goto_location);
            }
            return;
        }

        const {data, error} = await doBlockAction(serverUrl, {
            subtype: 'execute',
            context: 'post',
            post_id: post.id,
            action_id: actionId,
            cookie: effectiveCookie,
            selected_option: selectedOption,
            query,
            form_values: formValues,
            integration_format: integrationFormat || undefined,
        });

        if (requestId !== refreshRequestIdRef.current) {
            return;
        }

        if (error) {
            const message = error instanceof Error && error.message ? error.message : undefined;
            setActionError(message ?? actionFailedMessage);
            return;
        }

        const bodyError = topLevelErrorMessage(data);
        if (bodyError) {
            setActionError(bodyError);
            return;
        }

        if (data?.errors && Object.keys(data.errors).length > 0) {
            setFieldErrors(data.errors);
            return;
        }

        setFieldErrors({});

        if (data?.goto_location) {
            handleGotoLocation(serverUrl, intl, data.goto_location);
        }

        if (data?.type === 'dialog' && data.block_dialog) {
            IntegrationsManager.getManager(serverUrl).setDialog({
                trigger_id: data.trigger_id || '',
                channel_id: channelId,
                block_dialog: data.block_dialog,
            });
            return;
        }

        if (data?.type === 'refresh' && Array.isArray(data.mm_blocks)) {
            await dismissMmBlocksExpandedContentIfOpen();
            setBlocksOverride(translateMMBlocks(data.mm_blocks));
            if (typeof data.mm_blocks_actions === 'string') {
                setCookieOverride(data.mm_blocks_actions);
            }
            setBlocksEpoch((epoch) => epoch + 1);
        }
    }, [applyClientFormValidation, channelId, effectiveCookie, hasUploadingFields, integrationFormat, intl, post.id, serverUrl]);

    const handleLookup: LookupHandler = useCallback(async (actionId, userInput, formValues) => {
        if (integrationFormat === 'attachment' || !blockActionsEnabled) {
            return [];
        }

        const {data} = await doBlockAction(serverUrl, {
            subtype: 'lookup',
            context: 'post',
            post_id: post.id,
            action_id: actionId,
            cookie: effectiveCookie,
            query: {query: userInput},
            form_values: formValues,
            integration_format: integrationFormat || undefined,
        });

        return data?.items ?? [];
    }, [blockActionsEnabled, effectiveCookie, integrationFormat, post.id, serverUrl]);

    if (!blocks || blocks.length === 0) {
        return null;
    }

    return (
        <View>
            <BlockRenderer
                key={`${post.id}-${blocksEpoch}`}
                blocks={blocks}
                channelId={channelId}
                context='post'
                errors={fieldErrors}
                imagesMetadata={post.metadata?.images as Record<string, PostImage> | undefined}
                inlineMarkdownActions={inlineMarkdownActions}
                location={location}
                onAction={handleAction}
                onErrorsChange={setFieldErrors}
                onLookup={handleLookup}
                onUploadingChange={setHasUploadingFields}
                postId={post.id}
                theme={theme}
            />
            {actionError ? (
                <View style={styles.actionError}>
                    <SectionNotice
                        location={location}
                        testID='interactive_messages.action_error'
                        text={actionError}
                        title={intl.formatMessage(messages.errorTitle)}
                        type='danger'
                    />
                </View>
            ) : null}
        </View>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    blockActionsEnabled: observeBlockActionsEnabled(database),
}));

export default withDatabase(enhanced(InteractiveMessages));
