// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import {Anthropic} from '@anthropic-ai/sdk';

export class ClaudePromptHandler {
    private anthropic: Anthropic;
    private cachePath: string;
    private cacheEnabled: boolean;

    constructor(apiKey: string, cachePath?: string) {
        this.anthropic = new Anthropic({
            apiKey,
        });
        this.cachePath = cachePath || path.join(process.cwd(), 'detox/e2e/test/.pilot_cache.json');
        this.cacheEnabled = !process.env.PILOT_CACHE_DISABLED;

        // Ensure cache directory exists
        if (this.cacheEnabled && !fs.existsSync(path.dirname(this.cachePath))) {
            fs.mkdirSync(path.dirname(this.cachePath), {recursive: true});
        }
    }

    private getCacheKey(prompt: string): string {
        return crypto.createHash('sha256').update(prompt).digest('hex');
    }

    private loadCache(): Record<string, any> {
        try {
            if (fs.existsSync(this.cachePath)) {
                return JSON.parse(fs.readFileSync(this.cachePath, 'utf-8'));
            }
        } catch (error) {
            console.warn('Failed to load cache:', error);
        }
        return {};
    }

    private saveCache(cache: Record<string, any>): void {
        try {
            fs.writeFileSync(this.cachePath, JSON.stringify(cache, null, 2));
        } catch (error) {
            console.warn('Failed to save cache:', error);
        }
    }

    async runPrompt(prompt: string): Promise<string> {
        const systemPrompt = `
        You are a test automation assistant for a React Native application using Detox for end-to-end testing. Generate test steps that are:
        - Generic and adaptable to various UI components (e.g., lists, buttons, text fields).
        - Compatible with Detox matchers (by.id, by.text, by.textMatching for partial matches).
        - Resilient to timing issues by including waits, retries, or scrolling when needed.
        - Prioritize using testID for element identification over text or component type.
        - Handle dynamic content with partial text matches or regex-based matching.
        - Include explicit waits for loading states or animations (e.g., waitFor with reasonable timeouts).
        - Ensure elements are visible by scrolling if necessary before verifying visibility.
        - Avoid assuming immediate visibility; check if scrolling or waiting is required.
        - Use longer timeouts (e.g., 10-15 seconds) for operations prone to delays.
        - If a list is involved, generate steps to scroll to the target element.
        - Use regex for text matching when applicable, e.g., element(by.text(/text [A-Za-z]+/i)).

        Example steps for verifying a list item:
        - 'Wait for the list with testID "myList" to be visible for up to 10 seconds'
        - 'Scroll the list with testID "myList" until text containing "item-name" is visible'
        - 'Verify text containing "item-name" is visible with a 10-second timeout'
        - User regex matcher. e.g element(by.text(/text [A-Za-z]+/i));

        Avoid:
        - Hardcoding component types like ReactScrollView or exact text strings.
        - Assuming elements are immediately visible without scrolling or waiting.
        - Using short timeouts (e.g., 5 seconds) for UI interactions.
        `;
        const cacheKey = this.getCacheKey(prompt);

        // If caching is enabled
        if (this.cacheEnabled) {
            const cache = this.loadCache();

            // Check if we have a cached response
            if (cache[cacheKey]) {
                console.log('Using cached response for prompt');
                return cache[cacheKey].code;
            }
        }

        // No cache hit, make API call
        console.log('Making API call to Claude');
        const response = await this.anthropic.messages.create({
            model: 'claude-opus-4-20250514',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            system: systemPrompt,
        });

        // Extract text from the first content block
        const firstContent = response.content[0];
        if (firstContent && firstContent.type === 'text') {
            const result = firstContent.text;

            // Save to cache if enabled
            if (this.cacheEnabled) {
                const cache = this.loadCache();
                cache[cacheKey] = {
                    code: result,
                    creationTime: Date.now(),
                };
                this.saveCache(cache);
            }

            return result;
        }

        // Return empty string if no text content is found
        return '';
    }

    isSnapshotImageSupported = () => false; // Disable images for Mattermost tests
}
