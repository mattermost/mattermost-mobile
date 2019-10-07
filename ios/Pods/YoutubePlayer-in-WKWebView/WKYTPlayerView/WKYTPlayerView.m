//  Copyright © 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#import "WKYTPlayerView.h"

// These are instances of NSString because we get them from parsing a URL. It would be silly to
// convert these into an integer just to have to convert the URL query string value into an integer
// as well for the sake of doing a value comparison. A full list of response error codes can be
// found here:
//      https://developers.google.com/youtube/iframe_api_reference
NSString static *const kWKYTPlayerStateUnstartedCode = @"-1";
NSString static *const kWKYTPlayerStateEndedCode = @"0";
NSString static *const kWKYTPlayerStatePlayingCode = @"1";
NSString static *const kWKYTPlayerStatePausedCode = @"2";
NSString static *const kWKYTPlayerStateBufferingCode = @"3";
NSString static *const kWKYTPlayerStateCuedCode = @"5";
NSString static *const kWKYTPlayerStateUnknownCode = @"unknown";

// Constants representing playback quality.
NSString static *const kWKYTPlaybackQualitySmallQuality = @"small";
NSString static *const kWKYTPlaybackQualityMediumQuality = @"medium";
NSString static *const kWKYTPlaybackQualityLargeQuality = @"large";
NSString static *const kWKYTPlaybackQualityHD720Quality = @"hd720";
NSString static *const kWKYTPlaybackQualityHD1080Quality = @"hd1080";
NSString static *const kWKYTPlaybackQualityHighResQuality = @"highres";
NSString static *const kWKYTPlaybackQualityAutoQuality = @"auto";
NSString static *const kWKYTPlaybackQualityDefaultQuality = @"default";
NSString static *const kWKYTPlaybackQualityUnknownQuality = @"unknown";

// Constants representing YouTube player errors.
NSString static *const kWKYTPlayerErrorInvalidParamErrorCode = @"2";
NSString static *const kWKYTPlayerErrorHTML5ErrorCode = @"5";
NSString static *const kWKYTPlayerErrorVideoNotFoundErrorCode = @"100";
NSString static *const kWKYTPlayerErrorNotEmbeddableErrorCode = @"101";
NSString static *const kWKYTPlayerErrorCannotFindVideoErrorCode = @"105";
NSString static *const kWKYTPlayerErrorSameAsNotEmbeddableErrorCode = @"150";

// Constants representing player callbacks.
NSString static *const kWKYTPlayerCallbackOnReady = @"onReady";
NSString static *const kWKYTPlayerCallbackOnStateChange = @"onStateChange";
NSString static *const kWKYTPlayerCallbackOnPlaybackQualityChange = @"onPlaybackQualityChange";
NSString static *const kWKYTPlayerCallbackOnError = @"onError";
NSString static *const kWKYTPlayerCallbackOnPlayTime = @"onPlayTime";

NSString static *const kWKYTPlayerCallbackOnYouTubeIframeAPIReady = @"onYouTubeIframeAPIReady";
NSString static *const kWKYTPlayerCallbackOnYouTubeIframeAPIFailedToLoad = @"onYouTubeIframeAPIFailedToLoad";

NSString static *const kWKYTPlayerEmbedUrlRegexPattern = @"^http(s)://(www.)youtube.com/embed/(.*)$";
NSString static *const kWKYTPlayerAdUrlRegexPattern = @"^http(s)://pubads.g.doubleclick.net/pagead/conversion/";
NSString static *const kWKYTPlayerOAuthRegexPattern = @"^http(s)://accounts.google.com/o/oauth2/(.*)$";
NSString static *const kWKYTPlayerStaticProxyRegexPattern = @"^https://content.googleapis.com/static/proxy.html(.*)$";
NSString static *const kWKYTPlayerSyndicationRegexPattern = @"^https://tpc.googlesyndication.com/sodar/(.*).html$";

@interface WKYTPlayerView()

@property (nonatomic, strong) NSURL *originURL;
@property (nonatomic, weak) UIView *initialLoadingView;

@end

@implementation WKYTPlayerView

- (BOOL)loadWithVideoId:(NSString *)videoId {
    return [self loadWithVideoId:videoId playerVars:nil];
}

- (BOOL)loadWithPlaylistId:(NSString *)playlistId {
    return [self loadWithPlaylistId:playlistId playerVars:nil];
}

- (BOOL)loadWithVideoId:(NSString *)videoId playerVars:(NSDictionary *)playerVars {
    if (!playerVars) {
        playerVars = @{};
    }
    NSDictionary *playerParams = @{ @"videoId" : videoId, @"playerVars" : playerVars };
    return [self loadWithPlayerParams:playerParams];
}

- (BOOL)loadWithVideoId:(NSString *)videoId playerVars:(NSDictionary *)playerVars templatePath:(NSString *)path {
    if (!playerVars) {
        playerVars = @{};
    }
    NSMutableDictionary *playerParams = [@{@"videoId" : videoId, @"playerVars" : playerVars} mutableCopy];
    if (path) {
        playerParams[@"templatePath"] = path;
    }
    return [self loadWithPlayerParams:[playerParams copy]];
}

- (BOOL)loadWithPlaylistId:(NSString *)playlistId playerVars:(NSDictionary *)playerVars {
    
    // Mutable copy because we may have been passed an immutable config dictionary.
    NSMutableDictionary *tempPlayerVars = [[NSMutableDictionary alloc] init];
    [tempPlayerVars setValue:@"playlist" forKey:@"listType"];
    [tempPlayerVars setValue:playlistId forKey:@"list"];
    if (playerVars) {
        [tempPlayerVars addEntriesFromDictionary:playerVars];
    }
    
    NSDictionary *playerParams = @{ @"playerVars" : tempPlayerVars };
    return [self loadWithPlayerParams:playerParams];
}

#pragma mark - Player methods

- (void)playVideo {
    [self stringFromEvaluatingJavaScript:@"player.playVideo();" completionHandler:nil];
}

- (void)pauseVideo {
    [self notifyDelegateOfYouTubeCallbackUrl:[NSURL URLWithString:[NSString stringWithFormat:@"ytplayer://onStateChange?data=%@", kWKYTPlayerStatePausedCode]]];
    [self stringFromEvaluatingJavaScript:@"player.pauseVideo();" completionHandler:nil];
}

- (void)stopVideo {
    [self stringFromEvaluatingJavaScript:@"player.stopVideo();" completionHandler:nil];
}

- (void)seekToSeconds:(float)seekToSeconds allowSeekAhead:(BOOL)allowSeekAhead {
    NSNumber *secondsValue = [NSNumber numberWithFloat:seekToSeconds];
    NSString *allowSeekAheadValue = [self stringForJSBoolean:allowSeekAhead];
    NSString *command = [NSString stringWithFormat:@"player.seekTo(%@, %@);", secondsValue, allowSeekAheadValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

#pragma mark - Cueing methods

- (void)cueVideoById:(NSString *)videoId
        startSeconds:(float)startSeconds
    suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.cueVideoById('%@', %@, '%@');",
                         videoId, startSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

- (void)cueVideoById:(NSString *)videoId
        startSeconds:(float)startSeconds
          endSeconds:(float)endSeconds
    suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSNumber *endSecondsValue = [NSNumber numberWithFloat:endSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.cueVideoById({'videoId': '%@', 'startSeconds': %@, 'endSeconds': %@, 'suggestedQuality': '%@'});", videoId, startSecondsValue, endSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

- (void)loadVideoById:(NSString *)videoId
         startSeconds:(float)startSeconds
     suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.loadVideoById('%@', %@, '%@');",
                         videoId, startSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

- (void)loadVideoById:(NSString *)videoId
         startSeconds:(float)startSeconds
           endSeconds:(float)endSeconds
     suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSNumber *endSecondsValue = [NSNumber numberWithFloat:endSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.loadVideoById({'videoId': '%@', 'startSeconds': %@, 'endSeconds': %@, 'suggestedQuality': '%@'});",videoId, startSecondsValue, endSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

- (void)cueVideoByURL:(NSString *)videoURL
         startSeconds:(float)startSeconds
     suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.cueVideoByUrl('%@', %@, '%@');",
                         videoURL, startSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

- (void)cueVideoByURL:(NSString *)videoURL
         startSeconds:(float)startSeconds
           endSeconds:(float)endSeconds
     suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSNumber *endSecondsValue = [NSNumber numberWithFloat:endSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.cueVideoByUrl('%@', %@, %@, '%@');",
                         videoURL, startSecondsValue, endSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

- (void)loadVideoByURL:(NSString *)videoURL
          startSeconds:(float)startSeconds
      suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.loadVideoByUrl('%@', %@, '%@');",
                         videoURL, startSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

- (void)loadVideoByURL:(NSString *)videoURL
          startSeconds:(float)startSeconds
            endSeconds:(float)endSeconds
      suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSNumber *endSecondsValue = [NSNumber numberWithFloat:endSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.loadVideoByUrl('%@', %@, %@, '%@');",
                         videoURL, startSecondsValue, endSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

#pragma mark - Cueing methods for lists

- (void)cuePlaylistByPlaylistId:(NSString *)playlistId
                          index:(int)index
                   startSeconds:(float)startSeconds
               suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSString *playlistIdString = [NSString stringWithFormat:@"'%@'", playlistId];
    [self cuePlaylist:playlistIdString
                index:index
         startSeconds:startSeconds
     suggestedQuality:suggestedQuality];
}

- (void)cuePlaylistByVideos:(NSArray *)videoIds
                      index:(int)index
               startSeconds:(float)startSeconds
           suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    [self cuePlaylist:[self stringFromVideoIdArray:videoIds]
                index:index
         startSeconds:startSeconds
     suggestedQuality:suggestedQuality];
}

- (void)loadPlaylistByPlaylistId:(NSString *)playlistId
                           index:(int)index
                    startSeconds:(float)startSeconds
                suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSString *playlistIdString = [NSString stringWithFormat:@"'%@'", playlistId];
    [self loadPlaylist:playlistIdString
                 index:index
          startSeconds:startSeconds
      suggestedQuality:suggestedQuality];
}

- (void)loadPlaylistByVideos:(NSArray *)videoIds
                       index:(int)index
                startSeconds:(float)startSeconds
            suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    [self loadPlaylist:[self stringFromVideoIdArray:videoIds]
                 index:index
          startSeconds:startSeconds
      suggestedQuality:suggestedQuality];
}

#pragma mark - Setting the playback rate

- (void)getPlaybackRate:(void (^ __nullable)(float playbackRate, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getPlaybackRate();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(0, error);
            } else {
                completionHandler([response floatValue], nil);
            }
        }
    }];
}

- (void)setPlaybackRate:(float)suggestedRate {
    NSString *command = [NSString stringWithFormat:@"player.setPlaybackRate(%f);", suggestedRate];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

- (void)getAvailablePlaybackRates:(void (^ __nullable)(NSArray * __nullable availablePlaybackRates, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getAvailablePlaybackRates();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(nil, error);
            } else {
                NSData *playbackRateData = [response dataUsingEncoding:NSUTF8StringEncoding];
                NSError *jsonDeserializationError;
                NSArray *playbackRates = [NSJSONSerialization JSONObjectWithData:playbackRateData
                                                                         options:kNilOptions
                                                                           error:&jsonDeserializationError];
                if (jsonDeserializationError) {
                    completionHandler(nil, jsonDeserializationError);
                }

                completionHandler(playbackRates, nil);
            }
        }
    }];
}

#pragma mark - Setting playback behavior for playlists

- (void)setLoop:(BOOL)loop {
    NSString *loopPlayListValue = [self stringForJSBoolean:loop];
    NSString *command = [NSString stringWithFormat:@"player.setLoop(%@);", loopPlayListValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

- (void)setShuffle:(BOOL)shuffle {
    NSString *shufflePlayListValue = [self stringForJSBoolean:shuffle];
    NSString *command = [NSString stringWithFormat:@"player.setShuffle(%@);", shufflePlayListValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

#pragma mark - Playback status

- (void)getVideoLoadedFraction:(void (^ __nullable)(float videoLoadedFraction, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getVideoLoadedFraction();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(0, error);
            } else {
                completionHandler([response floatValue], nil);
            }
        }
    }];
}

- (void)getPlayerState:(void (^ __nullable)(WKYTPlayerState playerState, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getPlayerState();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(kWKYTPlayerStateUnknown, error);
            } else {
                if ([response isKindOfClass: [NSNumber class]]) {
                    NSNumber *value = (NSNumber *)response;
                    response = [value stringValue];
                }
                completionHandler([WKYTPlayerView playerStateForString:response], nil);
            }
        }
    }];
}

- (void)getCurrentTime:(void (^ __nullable)(float currentTime, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getCurrentTime();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(0, error);
            } else {
                completionHandler([response floatValue], nil);
            }
        }
    }];
}

// Playback quality
- (void)getPlaybackQuality:(void (^ __nullable)(WKYTPlaybackQuality playbackQuality, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getPlaybackQuality();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(kWKYTPlaybackQualityUnknown, error);
            } else {
                completionHandler([WKYTPlayerView playbackQualityForString:response], nil);
            }
        }
    }];
}

- (void)setPlaybackQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.setPlaybackQuality('%@');", qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

#pragma mark - Video information methods

- (void)getDuration:(void (^ __nullable)(NSTimeInterval duration, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getDuration();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(0, error);
            } else {
                if (response != (id) [NSNull null]) {
                    completionHandler([response doubleValue], nil);
                }
                else {
                    completionHandler(0, nil);
                }
            }
        }
    }];
}

- (void)getVideoUrl:(void (^ __nullable)(NSURL * __nullable videoUrl, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getVideoUrl();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(nil, error);
            } else {
                completionHandler([NSURL URLWithString:response], nil);
            }
        }
    }];
}

- (void)getVideoEmbedCode:(void (^ __nullable)(NSString * __nullable videoEmbedCode, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getVideoEmbedCode();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(nil, error);
            } else {
                completionHandler(response, nil);
            }
        }
    }];
}

#pragma mark - Playlist methods

- (void)getPlaylist:(void (^ __nullable)(NSArray * __nullable playlist, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getPlaylist();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(nil, error);
            } else {

                if ([response isKindOfClass:[NSNull class]]) {
                    completionHandler(nil, nil);
                    return;
                }

                NSArray *videoIds;

                if ([response isKindOfClass:[NSArray class]])
                {
                    videoIds = (NSArray *)response;
                }
                else
                {
                    NSData *playlistData = [response dataUsingEncoding:NSUTF8StringEncoding];
                    NSError *jsonDeserializationError;
                    videoIds = [NSJSONSerialization JSONObjectWithData:playlistData
                                                                        options:kNilOptions
                                                                        error:&jsonDeserializationError];
                    if (jsonDeserializationError) {
                        completionHandler(nil, jsonDeserializationError);
                    }
                }

                completionHandler(videoIds, nil);
            }
        }
    }];
}

- (void)getPlaylistIndex:(void (^ __nullable)(int playlistIndex, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getPlaylistIndex();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(0, error);
            } else {
                completionHandler([response intValue], nil);
            }
        }
    }];
}

#pragma mark - Playing a video in a playlist

- (void)nextVideo {
    [self stringFromEvaluatingJavaScript:@"player.nextVideo();" completionHandler:nil];
}

- (void)previousVideo {
    [self stringFromEvaluatingJavaScript:@"player.previousVideo();" completionHandler:nil];
}

- (void)playVideoAt:(int)index {
    NSString *command =
    [NSString stringWithFormat:@"player.playVideoAt(%@);", [NSNumber numberWithInt:index]];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}


#pragma mark - Changing the player volume

/**
 * Mutes the player. Corresponds to this method from
 * the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#mute
 */

- (void)mute
{
    [self stringFromEvaluatingJavaScript:@"player.mute();" completionHandler:nil];
}

- (void)unMute
{
    [self stringFromEvaluatingJavaScript:@"player.unMute();" completionHandler:nil];
}

- (void)isMuted:(void (^ __nullable)(BOOL isMuted, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.isMuted();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(0, error);
            } else {
                completionHandler([response boolValue], nil);
            }
        }
    }];
}


#pragma mark - Helper methods

- (void)getAvailableQualityLevels:(void (^ __nullable)(NSArray * __nullable availableQualityLevels, NSError * __nullable error))completionHandler
{
    [self stringFromEvaluatingJavaScript:@"player.getAvailableQualityLevels().toString();" completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            if (error) {
                completionHandler(nil, error);
            } else {
                NSArray *rawQualityValues = [response componentsSeparatedByString:@","];
                NSMutableArray *levels = [[NSMutableArray alloc] init];
                for (NSString *rawQualityValue in rawQualityValues) {
                    WKYTPlaybackQuality quality = [WKYTPlayerView playbackQualityForString:rawQualityValue];
                    [levels addObject:[NSNumber numberWithInt:quality]];
                }

                completionHandler(levels, nil);
            }
        }
    }];
}

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler
{
    NSURLRequest *request = navigationAction.request;
    
    if ([request.URL.host isEqual: self.originURL.host]) {
        decisionHandler(WKNavigationActionPolicyAllow);
        return;
    } else if ([request.URL.scheme isEqual:@"ytplayer"]) {
        [self notifyDelegateOfYouTubeCallbackUrl:request.URL];
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    } else if ([request.URL.scheme isEqual: @"http"] || [request.URL.scheme isEqual:@"https"]) {
        if([self handleHttpNavigationToUrl:request.URL]) {
            decisionHandler(WKNavigationActionPolicyAllow);
        } else {
            decisionHandler(WKNavigationActionPolicyCancel);
        }
        return;
    }
    
    decisionHandler(WKNavigationActionPolicyAllow);
}

- (void)webView:(WKWebView *)webView didFailNavigation:(null_unspecified WKNavigation *)navigation withError:(NSError *)error
{
    if (self.initialLoadingView) {
        [self.initialLoadingView removeFromSuperview];
    }
}

- (WKWebView *)webView:(WKWebView *)webView createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration forNavigationAction:(WKNavigationAction *)navigationAction windowFeatures:(WKWindowFeatures *)windowFeatures {
    if (!navigationAction.targetFrame.isMainFrame) {
        //  open link with target="_blank" in the same webView
        [webView loadRequest:navigationAction.request];
    }
    return nil;
}

/**
 * Convert a quality value from NSString to the typed enum value.
 *
 * @param qualityString A string representing playback quality. Ex: "small", "medium", "hd1080".
 * @return An enum value representing the playback quality.
 */
+ (WKYTPlaybackQuality)playbackQualityForString:(NSString *)qualityString {
    WKYTPlaybackQuality quality = kWKYTPlaybackQualityUnknown;
    
    if ([qualityString isEqualToString:kWKYTPlaybackQualitySmallQuality]) {
        quality = kWKYTPlaybackQualitySmall;
    } else if ([qualityString isEqualToString:kWKYTPlaybackQualityMediumQuality]) {
        quality = kWKYTPlaybackQualityMedium;
    } else if ([qualityString isEqualToString:kWKYTPlaybackQualityLargeQuality]) {
        quality = kWKYTPlaybackQualityLarge;
    } else if ([qualityString isEqualToString:kWKYTPlaybackQualityHD720Quality]) {
        quality = kWKYTPlaybackQualityHD720;
    } else if ([qualityString isEqualToString:kWKYTPlaybackQualityHD1080Quality]) {
        quality = kWKYTPlaybackQualityHD1080;
    } else if ([qualityString isEqualToString:kWKYTPlaybackQualityHighResQuality]) {
        quality = kWKYTPlaybackQualityHighRes;
    } else if ([qualityString isEqualToString:kWKYTPlaybackQualityAutoQuality]) {
        quality = kWKYTPlaybackQualityAuto;
    }
    
    return quality;
}

/**
 * Convert a |WKYTPlaybackQuality| value from the typed value to NSString.
 *
 * @param quality A |WKYTPlaybackQuality| parameter.
 * @return An |NSString| value to be used in the JavaScript bridge.
 */
+ (NSString *)stringForPlaybackQuality:(WKYTPlaybackQuality)quality {
    switch (quality) {
        case kWKYTPlaybackQualitySmall:
            return kWKYTPlaybackQualitySmallQuality;
        case kWKYTPlaybackQualityMedium:
            return kWKYTPlaybackQualityMediumQuality;
        case kWKYTPlaybackQualityLarge:
            return kWKYTPlaybackQualityLargeQuality;
        case kWKYTPlaybackQualityHD720:
            return kWKYTPlaybackQualityHD720Quality;
        case kWKYTPlaybackQualityHD1080:
            return kWKYTPlaybackQualityHD1080Quality;
        case kWKYTPlaybackQualityHighRes:
            return kWKYTPlaybackQualityHighResQuality;
        case kWKYTPlaybackQualityAuto:
            return kWKYTPlaybackQualityAutoQuality;
        default:
            return kWKYTPlaybackQualityUnknownQuality;
    }
}

/**
 * Convert a state value from NSString to the typed enum value.
 *
 * @param stateString A string representing player state. Ex: "-1", "0", "1".
 * @return An enum value representing the player state.
 */
+ (WKYTPlayerState)playerStateForString:(NSString *)stateString {
    WKYTPlayerState state = kWKYTPlayerStateUnknown;
    if ([stateString isEqualToString:kWKYTPlayerStateUnstartedCode]) {
        state = kWKYTPlayerStateUnstarted;
    } else if ([stateString isEqualToString:kWKYTPlayerStateEndedCode]) {
        state = kWKYTPlayerStateEnded;
    } else if ([stateString isEqualToString:kWKYTPlayerStatePlayingCode]) {
        state = kWKYTPlayerStatePlaying;
    } else if ([stateString isEqualToString:kWKYTPlayerStatePausedCode]) {
        state = kWKYTPlayerStatePaused;
    } else if ([stateString isEqualToString:kWKYTPlayerStateBufferingCode]) {
        state = kWKYTPlayerStateBuffering;
    } else if ([stateString isEqualToString:kWKYTPlayerStateCuedCode]) {
        state = kWKYTPlayerStateQueued;
    }
    return state;
}

/**
 * Convert a state value from the typed value to NSString.
 *
 * @param state A |WKYTPlayerState| parameter.
 * @return A string value to be used in the JavaScript bridge.
 */
+ (NSString *)stringForPlayerState:(WKYTPlayerState)state {
    switch (state) {
        case kWKYTPlayerStateUnstarted:
            return kWKYTPlayerStateUnstartedCode;
        case kWKYTPlayerStateEnded:
            return kWKYTPlayerStateEndedCode;
        case kWKYTPlayerStatePlaying:
            return kWKYTPlayerStatePlayingCode;
        case kWKYTPlayerStatePaused:
            return kWKYTPlayerStatePausedCode;
        case kWKYTPlayerStateBuffering:
            return kWKYTPlayerStateBufferingCode;
        case kWKYTPlayerStateQueued:
            return kWKYTPlayerStateCuedCode;
        default:
            return kWKYTPlayerStateUnknownCode;
    }
}

#pragma mark - Private methods

/**
 * Private method to handle "navigation" to a callback URL of the format
 * ytplayer://action?data=someData
 * This is how the WKWebView communicates with the containing Objective-C code.
 * Side effects of this method are that it calls methods on this class's delegate.
 *
 * @param url A URL of the format ytplayer://action?data=value.
 */
- (void)notifyDelegateOfYouTubeCallbackUrl: (NSURL *) url {
    NSString *action = url.host;
    
    // We know the query can only be of the format ytplayer://action?data=SOMEVALUE,
    // so we parse out the value.
    NSString *query = url.query;
    NSString *data;
    if (query) {
        data = [query componentsSeparatedByString:@"="][1];
    }
    
    if ([action isEqual:kWKYTPlayerCallbackOnReady]) {
        if (self.initialLoadingView) {
            [self.initialLoadingView removeFromSuperview];
        }
        if ([self.delegate respondsToSelector:@selector(playerViewDidBecomeReady:)]) {
            [self.delegate playerViewDidBecomeReady:self];
        }
    } else if ([action isEqual:kWKYTPlayerCallbackOnStateChange]) {
        if ([self.delegate respondsToSelector:@selector(playerView:didChangeToState:)]) {
            WKYTPlayerState state = kWKYTPlayerStateUnknown;
            
            if ([data isEqual:kWKYTPlayerStateEndedCode]) {
                state = kWKYTPlayerStateEnded;
            } else if ([data isEqual:kWKYTPlayerStatePlayingCode]) {
                state = kWKYTPlayerStatePlaying;
            } else if ([data isEqual:kWKYTPlayerStatePausedCode]) {
                state = kWKYTPlayerStatePaused;
            } else if ([data isEqual:kWKYTPlayerStateBufferingCode]) {
                state = kWKYTPlayerStateBuffering;
            } else if ([data isEqual:kWKYTPlayerStateCuedCode]) {
                state = kWKYTPlayerStateQueued;
            } else if ([data isEqual:kWKYTPlayerStateUnstartedCode]) {
                state = kWKYTPlayerStateUnstarted;
            }
            
            [self.delegate playerView:self didChangeToState:state];
        }
    } else if ([action isEqual:kWKYTPlayerCallbackOnPlaybackQualityChange]) {
        if ([self.delegate respondsToSelector:@selector(playerView:didChangeToQuality:)]) {
            WKYTPlaybackQuality quality = [WKYTPlayerView playbackQualityForString:data];
            [self.delegate playerView:self didChangeToQuality:quality];
        }
    } else if ([action isEqual:kWKYTPlayerCallbackOnError]) {
        if ([self.delegate respondsToSelector:@selector(playerView:receivedError:)]) {
            WKYTPlayerError error = kWKYTPlayerErrorUnknown;
            
            if ([data isEqual:kWKYTPlayerErrorInvalidParamErrorCode]) {
                error = kWKYTPlayerErrorInvalidParam;
            } else if ([data isEqual:kWKYTPlayerErrorHTML5ErrorCode]) {
                error = kWKYTPlayerErrorHTML5Error;
            } else if ([data isEqual:kWKYTPlayerErrorNotEmbeddableErrorCode] ||
                       [data isEqual:kWKYTPlayerErrorSameAsNotEmbeddableErrorCode]) {
                error = kWKYTPlayerErrorNotEmbeddable;
            } else if ([data isEqual:kWKYTPlayerErrorVideoNotFoundErrorCode] ||
                       [data isEqual:kWKYTPlayerErrorCannotFindVideoErrorCode]) {
                error = kWKYTPlayerErrorVideoNotFound;
            }
            
            [self.delegate playerView:self receivedError:error];
        }
    } else if ([action isEqualToString:kWKYTPlayerCallbackOnPlayTime]) {
        if ([self.delegate respondsToSelector:@selector(playerView:didPlayTime:)]) {
            float time = [data floatValue];
            [self.delegate playerView:self didPlayTime:time];
        }
    } else if ([action isEqualToString:kWKYTPlayerCallbackOnYouTubeIframeAPIFailedToLoad]) {
        if (self.initialLoadingView) {
            [self.initialLoadingView removeFromSuperview];
        }
        
        if ([self.delegate respondsToSelector:@selector(playerViewIframeAPIDidFailedToLoad:)]) {
            [self.delegate playerViewIframeAPIDidFailedToLoad:self];
        }
    }
}

- (BOOL)handleHttpNavigationToUrl:(NSURL *) url {
    // Usually this means the user has clicked on the YouTube logo or an error message in the
    // player. Most URLs should open in the browser. The only http(s) URL that should open in this
    // WKWebView is the URL for the embed, which is of the format:
    //     http(s)://www.youtube.com/embed/[VIDEO ID]?[PARAMETERS]
    NSError *error = NULL;
    NSRegularExpression *ytRegex =
    [NSRegularExpression regularExpressionWithPattern:kWKYTPlayerEmbedUrlRegexPattern
                                              options:NSRegularExpressionCaseInsensitive
                                                error:&error];
    NSTextCheckingResult *ytMatch =
    [ytRegex firstMatchInString:url.absoluteString
                        options:0
                          range:NSMakeRange(0, [url.absoluteString length])];
    
    NSRegularExpression *adRegex =
    [NSRegularExpression regularExpressionWithPattern:kWKYTPlayerAdUrlRegexPattern
                                              options:NSRegularExpressionCaseInsensitive
                                                error:&error];
    NSTextCheckingResult *adMatch =
    [adRegex firstMatchInString:url.absoluteString
                        options:0
                          range:NSMakeRange(0, [url.absoluteString length])];
    
    NSRegularExpression *syndicationRegex =
    [NSRegularExpression regularExpressionWithPattern:kWKYTPlayerSyndicationRegexPattern
                                              options:NSRegularExpressionCaseInsensitive
                                                error:&error];
    
    NSTextCheckingResult *syndicationMatch =
    [syndicationRegex firstMatchInString:url.absoluteString
                                 options:0
                                   range:NSMakeRange(0, [url.absoluteString length])];
    
    NSRegularExpression *oauthRegex =
    [NSRegularExpression regularExpressionWithPattern:kWKYTPlayerOAuthRegexPattern
                                              options:NSRegularExpressionCaseInsensitive
                                                error:&error];
    NSTextCheckingResult *oauthMatch =
    [oauthRegex firstMatchInString:url.absoluteString
                           options:0
                             range:NSMakeRange(0, [url.absoluteString length])];
    
    NSRegularExpression *staticProxyRegex =
    [NSRegularExpression regularExpressionWithPattern:kWKYTPlayerStaticProxyRegexPattern
                                              options:NSRegularExpressionCaseInsensitive
                                                error:&error];
    NSTextCheckingResult *staticProxyMatch =
    [staticProxyRegex firstMatchInString:url.absoluteString
                                 options:0
                                   range:NSMakeRange(0, [url.absoluteString length])];
    
    if (ytMatch || adMatch || oauthMatch || staticProxyMatch || syndicationMatch) {
        return YES;
    } else {
        [[UIApplication sharedApplication] openURL:url];
        return NO;
    }
}


/**
 * Private helper method to load an iframe player with the given player parameters.
 *
 * @param additionalPlayerParams An NSDictionary of parameters in addition to required parameters
 *                               to instantiate the HTML5 player with. This differs depending on
 *                               whether a single video or playlist is being loaded.
 * @return YES if successful, NO if not.
 */
- (BOOL)loadWithPlayerParams:(NSDictionary *)additionalPlayerParams {
    NSDictionary *playerCallbacks = @{
                                      @"onReady" : @"onReady",
                                      @"onStateChange" : @"onStateChange",
                                      @"onPlaybackQualityChange" : @"onPlaybackQualityChange",
                                      @"onError" : @"onPlayerError"
                                      };
    NSMutableDictionary *playerParams = [[NSMutableDictionary alloc] init];
    if (additionalPlayerParams) {
        [playerParams addEntriesFromDictionary:additionalPlayerParams];
    }
    if (![playerParams objectForKey:@"height"]) {
        [playerParams setValue:@"100%" forKey:@"height"];
    }
    if (![playerParams objectForKey:@"width"]) {
        [playerParams setValue:@"100%" forKey:@"width"];
    }
    
    [playerParams setValue:playerCallbacks forKey:@"events"];
    
    if ([playerParams objectForKey:@"playerVars"]) {
        NSMutableDictionary *playerVars = [[NSMutableDictionary alloc] init];
        [playerVars addEntriesFromDictionary:[playerParams objectForKey:@"playerVars"]];
        
        if (![playerVars objectForKey:@"origin"]) {
            self.originURL = [NSURL URLWithString:@"about:blank"];
        } else {
            self.originURL = [NSURL URLWithString: [playerVars objectForKey:@"origin"]];
        }
    } else {
        // This must not be empty so we can render a '{}' in the output JSON
        [playerParams setValue:[[NSDictionary alloc] init] forKey:@"playerVars"];
    }
    
    // Remove the existing webView to reset any state
    [self.webView removeFromSuperview];
    _webView = [self createNewWebView];
    [self addSubview:self.webView];
    
    self.webView.translatesAutoresizingMaskIntoConstraints = NO;
    NSLayoutConstraint *topConstraint = [NSLayoutConstraint constraintWithItem:self.webView
                                                                 attribute:NSLayoutAttributeTop
                                                                 relatedBy:NSLayoutRelationEqual
                                                                    toItem:self
                                                                 attribute:NSLayoutAttributeTop
                                                                multiplier:1.0
                                                                  constant:0.0];
    NSLayoutConstraint *leftConstraint = [NSLayoutConstraint constraintWithItem:self.webView
                                                                 attribute:NSLayoutAttributeLeft
                                                                 relatedBy:NSLayoutRelationEqual
                                                                    toItem:self
                                                                 attribute:NSLayoutAttributeLeft
                                                                multiplier:1.0
                                                                  constant:0.0];
    NSLayoutConstraint *rightConstraint = [NSLayoutConstraint constraintWithItem:self.webView
                                                                 attribute:NSLayoutAttributeRight
                                                                 relatedBy:NSLayoutRelationEqual
                                                                    toItem:self
                                                                 attribute:NSLayoutAttributeRight
                                                                multiplier:1.0
                                                                  constant:0.0];
    NSLayoutConstraint *bottomConstraint = [NSLayoutConstraint constraintWithItem:self.webView
                                                                 attribute:NSLayoutAttributeBottom
                                                                 relatedBy:NSLayoutRelationEqual
                                                                    toItem:self
                                                                 attribute:NSLayoutAttributeBottom
                                                                multiplier:1.0
                                                                  constant:0.0];
    NSArray *constraints = @[topConstraint, leftConstraint, rightConstraint, bottomConstraint];
    [self addConstraints:constraints];
    
    NSError *error = nil;
    NSString *path = [additionalPlayerParams objectForKey:@"templatePath"];
    
    //in case path to the HTML template wan't provided from the outside
    if (!path) {
        path = [[NSBundle bundleForClass:[WKYTPlayerView class]] pathForResource:@"YTPlayerView-iframe-player"
                                                                          ofType:@"html"
                                                                     inDirectory:@"Assets"];
    }
    
    // in case of using Swift and embedded frameworks, resources included not in main bundle,
    // but in framework bundle
    if (!path) {
        path = [[[self class] frameworkBundle] pathForResource:@"YTPlayerView-iframe-player"
                                                        ofType:@"html"
                                                   inDirectory:@"Assets"];
    }
    
    NSString *embedHTMLTemplate =
    [NSString stringWithContentsOfFile:path encoding:NSUTF8StringEncoding error:&error];
    
    if (error) {
        NSLog(@"Received error rendering template: %@", error);
        return NO;
    }
    
    // Render the playerVars as a JSON dictionary.
    NSError *jsonRenderingError = nil;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:playerParams
                                                       options:NSJSONWritingPrettyPrinted
                                                         error:&jsonRenderingError];
    if (jsonRenderingError) {
        NSLog(@"Attempted configuration of player with invalid playerVars: %@ \tError: %@",
              playerParams,
              jsonRenderingError);
        return NO;
    }
    
    NSString *playerVarsJsonString =
    [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    
    NSString *embedHTML = [NSString stringWithFormat:embedHTMLTemplate, playerVarsJsonString];
    [self.webView loadHTMLString:embedHTML baseURL: self.originURL];
    self.webView.navigationDelegate = self;
    self.webView.UIDelegate = self;
    
    if ([self.delegate respondsToSelector:@selector(playerViewPreferredInitialLoadingView:)]) {
        UIView *initialLoadingView = [self.delegate playerViewPreferredInitialLoadingView:self];
        if (initialLoadingView) {
            initialLoadingView.frame = self.bounds;
            initialLoadingView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
            [self addSubview:initialLoadingView];
            self.initialLoadingView = initialLoadingView;
        }
    }
    
    return YES;
}

/**
 * Private method for cueing both cases of playlist ID and array of video IDs. Cueing
 * a playlist does not start playback.
 *
 * @param cueingString A JavaScript string representing an array, playlist ID or list of
 *                     video IDs to play with the playlist player.
 * @param index 0-index position of video to start playback on.
 * @param startSeconds Seconds after start of video to begin playback.
 * @param suggestedQuality Suggested WKYTPlaybackQuality to play the videos.
 */
- (void)cuePlaylist:(NSString *)cueingString
              index:(int)index
       startSeconds:(float)startSeconds
   suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *indexValue = [NSNumber numberWithInt:index];
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.cuePlaylist(%@, %@, %@, '%@');",
                         cueingString, indexValue, startSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

/**
 * Private method for loading both cases of playlist ID and array of video IDs. Loading
 * a playlist automatically starts playback.
 *
 * @param cueingString A JavaScript string representing an array, playlist ID or list of
 *                     video IDs to play with the playlist player.
 * @param index 0-index position of video to start playback on.
 * @param startSeconds Seconds after start of video to begin playback.
 * @param suggestedQuality Suggested WKYTPlaybackQuality to play the videos.
 */
- (void)loadPlaylist:(NSString *)cueingString
               index:(int)index
        startSeconds:(float)startSeconds
    suggestedQuality:(WKYTPlaybackQuality)suggestedQuality {
    NSNumber *indexValue = [NSNumber numberWithInt:index];
    NSNumber *startSecondsValue = [NSNumber numberWithFloat:startSeconds];
    NSString *qualityValue = [WKYTPlayerView stringForPlaybackQuality:suggestedQuality];
    NSString *command = [NSString stringWithFormat:@"player.loadPlaylist(%@, %@, %@, '%@');",
                         cueingString, indexValue, startSecondsValue, qualityValue];
    [self stringFromEvaluatingJavaScript:command completionHandler:nil];
}

/**
 * Private helper method for converting an NSArray of video IDs into its JavaScript equivalent.
 *
 * @param videoIds An array of video ID strings to convert into JavaScript format.
 * @return A JavaScript array in String format containing video IDs.
 */
- (NSString *)stringFromVideoIdArray:(NSArray *)videoIds {
    NSMutableArray *formattedVideoIds = [[NSMutableArray alloc] init];
    
    for (id unformattedId in videoIds) {
        [formattedVideoIds addObject:[NSString stringWithFormat:@"'%@'", unformattedId]];
    }
    
    return [NSString stringWithFormat:@"[%@]", [formattedVideoIds componentsJoinedByString:@", "]];
}

/**
 * Private method for evaluating JavaScript in the WebView.
 *
 * @param jsToExecute The JavaScript code in string format that we want to execute.
 */
- (void)stringFromEvaluatingJavaScript:(NSString *)jsToExecute completionHandler:(void (^ __nullable)(NSString * __nullable response, NSError * __nullable error))completionHandler{
    [self.webView evaluateJavaScript:jsToExecute completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
        if (completionHandler) {
            completionHandler(response, error);
        }
    }];
}

/**
 * Private method to convert a Objective-C BOOL value to JS boolean value.
 *
 * @param boolValue Objective-C BOOL value.
 * @return JavaScript Boolean value, i.e. "true" or "false".
 */
- (NSString *)stringForJSBoolean:(BOOL)boolValue {
    return boolValue ? @"true" : @"false";
}

#pragma mark - Exposed for Testing

- (void)setWebView:(WKWebView *)webView {
    _webView = webView;
}

- (WKWebView *)createNewWebView {
    
    // WKWebView equivalent for UI Web View's scalesPageToFit
    // 
    NSString *jScript = @"var meta = document.createElement('meta'); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width'); document.getElementsByTagName('head')[0].appendChild(meta);";
    
    WKUserScript *wkUScript = [[WKUserScript alloc] initWithSource:jScript injectionTime:WKUserScriptInjectionTimeAtDocumentEnd forMainFrameOnly:YES];
    WKUserContentController *wkUController = [[WKUserContentController alloc] init];
    [wkUController addUserScript:wkUScript];
    
    WKWebViewConfiguration *configuration = [WKWebViewConfiguration new];
    
    configuration.userContentController = wkUController;
    
    configuration.allowsInlineMediaPlayback = YES;
    configuration.mediaPlaybackRequiresUserAction = NO;
    
    WKWebView *webView = [[WKWebView alloc] initWithFrame:self.bounds configuration:configuration];
    webView.scrollView.scrollEnabled = NO;
    webView.scrollView.bounces = NO;
    
    if ([self.delegate respondsToSelector:@selector(playerViewPreferredWebViewBackgroundColor:)]) {
        webView.backgroundColor = [self.delegate playerViewPreferredWebViewBackgroundColor:self];
        if (webView.backgroundColor == [UIColor clearColor]) {
            webView.opaque = NO;
        }
    }
    
    return webView;
}

- (void)removeWebView {
    [self.webView removeFromSuperview];
    self.webView = nil;
}

+ (NSBundle *)frameworkBundle {
    static NSBundle* frameworkBundle = nil;
    static dispatch_once_t predicate;
    dispatch_once(&predicate, ^{
        NSString* mainBundlePath = [[NSBundle bundleForClass:[WKYTPlayerView class]] resourcePath];
        NSString* frameworkBundlePath = [mainBundlePath stringByAppendingPathComponent:@"WKYTPlayerView.bundle"];
        frameworkBundle = [NSBundle bundleWithPath:frameworkBundlePath];
    });
    return frameworkBundle;
}

@end
