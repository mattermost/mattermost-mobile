#import "RNDocumentPicker.h"

#if __has_include(<React/RCTConvert.h>)
#import <React/RCTConvert.h>
#import <React/RCTBridge.h>
#else // back compatibility for RN version < 0.40
#import "RCTConvert.h"
#import "RCTBridge.h"
#endif

#define IDIOM    UI_USER_INTERFACE_IDIOM()
#define IPAD     UIUserInterfaceIdiomPad

@interface RNDocumentPicker () <UIDocumentMenuDelegate,UIDocumentPickerDelegate>
@end


@implementation RNDocumentPicker {
    NSMutableArray *_composeCallbacks;
}

@synthesize bridge = _bridge;

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(show:(NSDictionary *)options
                  callback:(RCTResponseSenderBlock)callback) {

    NSArray *allowedUTIs = [RCTConvert NSArray:options[@"filetype"]];
    UIDocumentPickerViewController *documentPicker = [[UIDocumentPickerViewController alloc] initWithDocumentTypes:(NSArray *)allowedUTIs inMode:UIDocumentPickerModeImport];

    [[self composeCallbacks] addObject:callback];


    documentPicker.delegate = self;
    documentPicker.modalPresentationStyle = UIModalPresentationFormSheet;

    UIViewController *rootViewController = [[[[UIApplication sharedApplication]delegate] window] rootViewController];
    while (rootViewController.modalViewController) {
        rootViewController = rootViewController.modalViewController;
    }

    if ( IDIOM == IPAD ) {
        NSNumber *top = [RCTConvert NSNumber:options[@"top"]];
        NSNumber *left = [RCTConvert NSNumber:options[@"left"]];
        [documentPicker.popoverPresentationController setSourceRect: CGRectMake([left floatValue], [top floatValue], 0, 0)];
        [documentPicker.popoverPresentationController setSourceView: rootViewController.view];
    }

    [rootViewController presentViewController:documentPicker animated:YES completion:nil];
}


- (void)documentMenu:(UIDocumentMenuViewController *)documentMenu didPickDocumentPicker:(UIDocumentPickerViewController *)documentPicker {
    documentPicker.delegate = self;
    documentPicker.modalPresentationStyle = UIModalPresentationFormSheet;

    UIViewController *rootViewController = [[[[UIApplication sharedApplication]delegate] window] rootViewController];
    
    while (rootViewController.modalViewController) {
        rootViewController = rootViewController.modalViewController;
    }
    if ( IDIOM == IPAD ) {
        [documentPicker.popoverPresentationController setSourceRect: CGRectMake(rootViewController.view.frame.size.width/2, rootViewController.view.frame.size.height - rootViewController.view.frame.size.height / 6, 0, 0)];
        [documentPicker.popoverPresentationController setSourceView: rootViewController.view];
    }

    [rootViewController presentViewController:documentPicker animated:YES completion:nil];
}

- (void)documentPicker:(UIDocumentPickerViewController *)controller didPickDocumentAtURL:(NSURL *)url {
    if (controller.documentPickerMode == UIDocumentPickerModeImport) {
        RCTResponseSenderBlock callback = [[self composeCallbacks] lastObject];
        [[self composeCallbacks] removeLastObject];

        [url startAccessingSecurityScopedResource];

        NSFileCoordinator *coordinator = [[NSFileCoordinator alloc] init];
        __block NSError *error;

        [coordinator coordinateReadingItemAtURL:url options:NSFileCoordinatorReadingResolvesSymbolicLink error:&error byAccessor:^(NSURL *newURL) {
            NSMutableDictionary* result = [NSMutableDictionary dictionary];

            [result setValue:newURL.absoluteString forKey:@"uri"];
            [result setValue:[newURL lastPathComponent] forKey:@"fileName"];

            NSError *attributesError = nil;
            NSDictionary *fileAttributes = [[NSFileManager defaultManager] attributesOfItemAtPath:newURL.path error:&attributesError];
            if(!attributesError) {
                [result setValue:[fileAttributes objectForKey:NSFileSize] forKey:@"fileSize"];
            } else {
                NSLog(@"%@", attributesError);
            }

            callback(@[[NSNull null], result]);
        }];

        [url stopAccessingSecurityScopedResource];
    }
}

- (NSMutableArray *)composeCallbacks {
    if(_composeCallbacks == nil) {
        _composeCallbacks = [[NSMutableArray alloc] init];
    }
    return _composeCallbacks;
}

@end
