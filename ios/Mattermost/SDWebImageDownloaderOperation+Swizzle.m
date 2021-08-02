// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//
//  SDWebImageDownloaderOperation+Swizzle.m


#import "SDWebImageDownloaderOperation+Swizzle.h"
@import react_native_network_client;
#import <objc/runtime.h>

@implementation SDWebImageDownloaderOperation (Swizzle)

+ (void) load {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    [self swizzleInitMethod];
    [self swizzleURLSessionTaskDelegateMethod];
  });
}

+ (void) swizzleInitMethod {
  Class class = [self class];
  
  SEL originalSelector = @selector(initWithRequest:inSession:options:context:);
  SEL swizzledSelector = @selector(swizzled_initWithRequest:inSession:options:context:);
  
  Method originalMethod = class_getInstanceMethod(class, originalSelector);
  Method swizzledMethod = class_getInstanceMethod(class, swizzledSelector);
  
  method_exchangeImplementations(originalMethod, swizzledMethod);

}

+ (void) swizzleURLSessionTaskDelegateMethod {
  Class class = [self class];
  
  SEL originalSelector = @selector(URLSession:task:didReceiveChallenge:completionHandler:);
  SEL swizzledSelector = @selector(swizzled_URLSession:task:didReceiveChallenge:completionHandler:);
  
  Method originalMethod = class_getInstanceMethod(class, originalSelector);
  Method swizzledMethod = class_getInstanceMethod(class, swizzledSelector);
  
  method_exchangeImplementations(originalMethod, swizzledMethod);
}

#pragma mark - Method Swizzling

- (nonnull instancetype)swizzled_initWithRequest:(NSURLRequest *)request inSession:(NSURLSession *)session options:(SDWebImageDownloaderOptions)options context:(nullable SDWebImageContext *)context {
  SessionManager *nativeClientSessionManager = [SessionManager default];
  NSURL *sessionBaseUrl = [nativeClientSessionManager getSessionBaseUrlFor:request];
  if (sessionBaseUrl != nil) {
    // If we have a session configured for this request then use its configuration
    // to create a new session that SDWebImageDownloaderOperation will use for
    // this request. In addition, if we have an authorization header being added
    // to our session's requests, then we modify the request here as well using
    // our BearerAuthenticationAdapter.
    NSURLSessionConfiguration *configuration = [nativeClientSessionManager getSessionConfigurationFor:sessionBaseUrl];
    NSURLSession *newSession = [NSURLSession sessionWithConfiguration:configuration
                                                        delegate:self
                                                        delegateQueue:session.delegateQueue];
    NSURLRequest *authorizedRequest = [BearerAuthenticationAdapter addAuthorizationBearerTokenTo:request withSessionBaseUrlString:sessionBaseUrl.absoluteString];
    
    return [self swizzled_initWithRequest:authorizedRequest inSession:newSession options:options context:context];
  }
  
  return [self swizzled_initWithRequest:request inSession:session options:options context:context];
}


- (void)swizzled_URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler {
  SessionManager *nativeClientSessionManager = [SessionManager default];
  NSURL *sessionBaseUrl = [nativeClientSessionManager getSessionBaseUrlFor:task.currentRequest];
  if (sessionBaseUrl != nil) {
    // If we have a session configured for this request then we'll fetch and
    // apply the necessary credentials for NSURLAuthenticationMethodServerTrust
    // and NSURLAuthenticationMethodClientCertificate.
    NSURLCredential *credential = nil;
    NSURLSessionAuthChallengeDisposition disposition = NSURLSessionAuthChallengePerformDefaultHandling;
    
    NSString *authenticationMethod = challenge.protectionSpace.authenticationMethod;
    if ([authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]) {
      if ([nativeClientSessionManager getTrustSelfSignedServerCertificateFor:sessionBaseUrl]) {
        credential = [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust];
        disposition = NSURLSessionAuthChallengeUseCredential;
      }
    } else if ([authenticationMethod isEqualToString:NSURLAuthenticationMethodClientCertificate]) {
      credential = [nativeClientSessionManager getCredentialFor:sessionBaseUrl];
      disposition = NSURLSessionAuthChallengeUseCredential;
    }
    
    if (completionHandler) {
        completionHandler(disposition, credential);
    }
    
    return;
  }

  [self swizzled_URLSession:session task:task didReceiveChallenge:challenge completionHandler:completionHandler];
}

@end
