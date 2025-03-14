// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//
//  SDWebImageDownloaderOperation+Swizzle.m


#import "SDWebImageDownloaderOperation+Swizzle.h"
@import react_native_network_client;
#import <objc/runtime.h>

typedef id (*InitWithRequestInSessionOptionsContextIMP)(id, SEL, NSURLRequest *, NSURLSession *, SDWebImageDownloaderOptions *, id);
typedef void (*URLSessionTaskDidReceiveChallengeIMP)(id, SEL, NSURLSession *, NSURLSessionTask *, NSURLAuthenticationChallenge *, void (^)(NSURLSessionAuthChallengeDisposition, NSURLCredential *));

@implementation SDWebImageDownloaderOperation (Swizzle)

static InitWithRequestInSessionOptionsContextIMP originalInitWithRequestInSessionOptionsContextImplementation = NULL;
static URLSessionTaskDidReceiveChallengeIMP originalURLSessionTaskDidReceiveChallengeImplementation = NULL;

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
  
  // Get the implementation of the swizzled method
  IMP swizzledImplementation = method_getImplementation(swizzledMethod);
  
  // Get the original implementation
  IMP originalImplementation = method_getImplementation(originalMethod);
  
  // Set the original method's implementation to the swizzled method's implementation
  method_setImplementation(originalMethod, swizzledImplementation);
  
  originalInitWithRequestInSessionOptionsContextImplementation = (InitWithRequestInSessionOptionsContextIMP)originalImplementation;

}

+ (void) swizzleURLSessionTaskDelegateMethod {
  Class class = [self class];
  
  SEL originalSelector = @selector(URLSession:task:didReceiveChallenge:completionHandler:);
  SEL swizzledSelector = @selector(swizzled_URLSession:task:didReceiveChallenge:completionHandler:);
  
  Method originalMethod = class_getInstanceMethod(class, originalSelector);
  Method swizzledMethod = class_getInstanceMethod(class, swizzledSelector);
  
  // Get the implementation of the swizzled method
  IMP swizzledImplementation = method_getImplementation(swizzledMethod);
  
  // Get the original implementation
  IMP originalImplementation = method_getImplementation(originalMethod);
  
  // Set the original method's implementation to the swizzled method's implementation
  method_setImplementation(originalMethod, swizzledImplementation);
  
  originalURLSessionTaskDidReceiveChallengeImplementation = (URLSessionTaskDidReceiveChallengeIMP)originalImplementation;
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
    
    return originalInitWithRequestInSessionOptionsContextImplementation(self, @selector(initWithRequest:inSession:options:context:), authorizedRequest, newSession, &options, context);
  }
  
  return originalInitWithRequestInSessionOptionsContextImplementation(self, @selector(initWithRequest:inSession:options:context:), request, session, &options, context);
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

  originalURLSessionTaskDidReceiveChallengeImplementation(self, @selector(URLSession:task:didReceiveChallenge:completionHandler:), session, task, challenge, completionHandler);
}

@end
