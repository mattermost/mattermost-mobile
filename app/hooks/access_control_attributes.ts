// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';

import {fetchChannelAccessControlAttributes} from '@actions/remote/channel_access_control_attributes';
import {useServerUrl} from '@context/server';

// Module-level cache for access control attributes
// The cache stores processed tags with a timestamp to implement a TTL (time-to-live)
const attributesCache: Record<string, {
    processedTags: string[];
    timestamp: number;
}> = {};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * A hook for fetching access control attributes for a channel.
 *
 * @param entityType - The type of entity (e.g., 'channel')
 * @param entityId - The ID of the entity
 * @param hasAbacPolicyEnforced - Whether the entity has abac policy enforcement enabled
 * @returns An object containing the attribute tags, loading state, and fetch function
 */
export const useAccessControlAttributes = (
    entityType: 'channel',
    entityId: string | undefined,
    hasAbacPolicyEnforced: boolean | undefined,
) => {
    const serverUrl = useServerUrl();
    const [attributeTags, setAttributeTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Use useRef to track if the component is mounted
    const isMounted = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Helper function to process attribute data and extract tags
    const processAttributeData = useCallback((data: Record<string, string[]> | undefined) => {
        if (!data || typeof data !== 'object') {
            return [];
        }

        const tags: string[] = [];

        // Process each entry in the attributes object
        for (const values of Object.values(data)) {
            if (Array.isArray(values)) {
                for (const value of values) {
                    if (value !== undefined && value !== null) {
                        tags.push(`${value}`);
                    }
                }
            }
        }

        return tags;
    }, []);

    const fetchAttributes = useCallback(async (forceRefresh = false) => {
        if (!entityId || !hasAbacPolicyEnforced) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Check cache first
            const cacheKey = `${serverUrl}:${entityType}:${entityId}`;
            const cachedEntry = attributesCache[cacheKey];
            const now = Date.now();

            // Use cache if it exists and is not too old and forceRefresh is false
            if (!forceRefresh && cachedEntry && (now - cachedEntry.timestamp < CACHE_TTL)) {
                // Use the pre-processed tags directly from the cache
                setAttributeTags(cachedEntry.processedTags);
                setLoading(false);
                return;
            }

            // If no cache or cache expired, fetch from API
            if (entityType === 'channel') {
                const result = await fetchChannelAccessControlAttributes(serverUrl, entityId);

                if (isMounted.current) {
                    if (result?.attributes && typeof result.attributes === 'object') {
                        // Process the data once
                        const tags = processAttributeData(result.attributes);

                        // Store only the processed tags in cache
                        attributesCache[cacheKey] = {
                            processedTags: tags,
                            timestamp: now,
                        };

                        // Update the state
                        setAttributeTags(tags);
                    } else {
                        setAttributeTags([]);
                    }
                }
            }
        } catch (err) {
            if (isMounted.current) {
                setError(err as Error);
                setAttributeTags([]);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [entityType, entityId, hasAbacPolicyEnforced, serverUrl, processAttributeData]);

    // Fetch attributes when the component mounts or when dependencies change
    useEffect(() => {
        fetchAttributes();
    }, [fetchAttributes]);

    return {
        attributeTags,
        loading,
        error,
        fetchAttributes,
    };
};
