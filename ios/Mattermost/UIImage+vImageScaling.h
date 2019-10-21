//
//  UIImage+vImageScaling.h
//  UIImage+vImageScaling
//
//  Created by Matt Donnelly on 03/07/2013.
//  Copyright (c) 2013 Matt Donnelly. All rights reserved.
//  taken from https://gist.github.com/mattdonnelly/5924492

#import <UIKit/UIKit.h>

@interface UIImage (vImageScaling)

- (UIImage *)vImageScaledImageWithSize:(CGSize)destSize;
- (UIImage *)vImageScaledImageWithSize:(CGSize)destSize contentMode:(UIViewContentMode)contentMode;

@end
