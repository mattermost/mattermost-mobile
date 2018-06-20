#import "RCTYouTubeStandalone.h"
#if __has_include(<XCDYouTubeKit/XCDYouTubeKit.h>)
#import <XCDYouTubeKit/XCDYouTubeKit.h>
#define XCD_YOUTUBE_KIT_INSTALLED
#endif

@implementation RCTYouTubeStandalone {
    RCTPromiseResolveBlock resolver;
    RCTPromiseRejectBlock rejecter;
};

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(playVideo,
                 playVideoWithResolver:(NSString*)videoId
                 startTime:(NSNumber* _Nonnull)startTime
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    #ifndef XCD_YOUTUBE_KIT_INSTALLED
        reject(@"error", @"XCDYouTubeKit is not installed", nil);
    #else
        dispatch_async(dispatch_get_main_queue(), ^{
            XCDYouTubeVideoPlayerViewController *videoPlayerViewController =
                [[XCDYouTubeVideoPlayerViewController alloc] initWithVideoIdentifier:videoId];
            NSTimeInterval initialPlaybackTime = [startTime doubleValue];
            videoPlayerViewController.moviePlayer.initialPlaybackTime = initialPlaybackTime;
            [[NSNotificationCenter defaultCenter] addObserver:self
                                                     selector:@selector(moviePlayerPlaybackDidFinish:)
                                                         name:MPMoviePlayerPlaybackDidFinishNotification
                                                       object:videoPlayerViewController.moviePlayer];

            resolver = resolve;
            rejecter = reject;

            UIViewController *root = [[[[UIApplication sharedApplication] delegate] window] rootViewController];
            [root presentMoviePlayerViewControllerAnimated:videoPlayerViewController];
        });
    #endif
}

#ifdef XCD_YOUTUBE_KIT_INSTALLED
    - (void) moviePlayerPlaybackDidFinish:(NSNotification *)notification
    {
        [[NSNotificationCenter defaultCenter] removeObserver:self
                                                        name:MPMoviePlayerPlaybackDidFinishNotification
                                                      object:notification.object];

        MPMovieFinishReason finishReason = [notification.userInfo[MPMoviePlayerPlaybackDidFinishReasonUserInfoKey] integerValue];

        if (finishReason == MPMovieFinishReasonPlaybackError)
        {
            NSError *error = notification.userInfo[XCDMoviePlayerPlaybackDidFinishErrorUserInfoKey];
            // Handle error
            rejecter(@"error", @"YTError", error);
        } else {
            resolver(@"success");
        }

        rejecter = nil;
        resolver = nil;
    }
#endif

@end
