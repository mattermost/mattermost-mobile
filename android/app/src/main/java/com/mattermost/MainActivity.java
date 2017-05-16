package com.mattermost;

import com.github.yamill.orientation.OrientationPackage;
import com.psykar.cookiemanager.CookieManagerPackage;
import com.BV.LinearGradient.LinearGradientPackage;

import com.reactnativenavigation.controllers.SplashActivity;

import java.lang.ref.WeakReference;

import android.content.Context;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.graphics.Color;
import android.widget.TextView;
import android.view.ViewGroup.LayoutParams;
import android.view.Gravity;
import android.util.TypedValue;

public class MainActivity extends SplashActivity {

    private static ImageView imageView;
    private static WeakReference<MainActivity> wr_activity;
    protected static MainActivity getActivity() {
        return wr_activity.get();
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    // @Override
    // protected String getMainComponentName() {
    //     return "Mattermost";
    // }

    @Override
    public LinearLayout createSplashLayout() {
        wr_activity = new WeakReference<>(this);
        final int drawableId = getImageId();

        Context context = getActivity();
        imageView = new ImageView(context);
        imageView.setImageResource(drawableId);

        LayoutParams layoutParams = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);
        imageView.setLayoutParams(layoutParams);

        imageView.setScaleType(ImageView.ScaleType.CENTER);

        LinearLayout view = new LinearLayout(this);

        view.setBackgroundColor(Color.parseColor("#FFFFFF"));
        view.setGravity(Gravity.CENTER);

        view.addView(imageView);
        return view;
    }

    private static int getImageId() {
        int drawableId = getActivity().getResources().getIdentifier("splash", "drawable", getActivity().getClass().getPackage().getName());
        if (drawableId == 0) {
            drawableId = getActivity().getResources().getIdentifier("splash", "drawable", getActivity().getPackageName());
        }
        return drawableId;
    }
}
