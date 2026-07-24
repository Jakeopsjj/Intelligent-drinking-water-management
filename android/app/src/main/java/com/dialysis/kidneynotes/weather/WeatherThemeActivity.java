package com.dialysis.kidneynotes.weather;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.Location;
import android.location.LocationManager;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.util.Locale;

/**
 * WeatherThemeActivity —— 安卓 WebView 承载网页天气主题
 *
 * 功能：
 *   1. 全屏无滚动、无边框、无 HUD 多余文字，仅显示背景 + 粒子
 *   2. 安卓原生获取定位（GPS/网络），通过 JSBridge 传给网页，替代网页 IP 定位
 *   3. 注入 Pexels API Key（从 BuildConfig 或本地配置读取）
 *   4. 全屏沉浸式（透明状态栏/导航栏）
 *
 * 用途：
 *   - 作为独立 Demo Activity 启动（查看天气主题效果）
 *   - 也可作为全局背景层（见 WeatherThemeBackgroundService 或集成到 MainActivity）
 *
 * 启动方式：
 *   Intent intent = new Intent(context, WeatherThemeActivity.class);
 *   startActivity(intent);
 *
 * 权限要求（AndroidManifest.xml）：
 *   <uses-permission android:name="android.permission.INTERNET" />
 *   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
 *   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
 */
public class WeatherThemeActivity extends Activity {

    private static final int REQUEST_LOCATION = 1001;

    private WebView webView;
    private LocationHelper locationHelper;

    /** Pexels API Key —— 从 BuildConfig 或 SharedPreferences 读取，这里给默认值 */
    private String pexelsApiKey = "";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 全屏沉浸式
        setupImmersiveFullscreen();

        // 初始化定位助手
        locationHelper = new LocationHelper(this);

        // 创建 WebView 承载天气主题
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        // 启用 JS（必需，粒子动画依赖）
        settings.setJavaScriptEnabled(true);
        // 启用 DOM 缓存（localStorage 缓存天气数据 + 图片 URL）
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        // 启用硬件加速（Canvas 粒子动画必需）：WebView 硬件加速通过 Manifest 或 setLayerType 设置
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        // 允许混合内容（HTTPS 页面加载 HTTP 资源，离线模式时需要）
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        // 缓存策略：默认使用缓存，无网络时使用本地缓存
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        // 视口适配
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        // 禁用滚动（全屏无滚动）
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        // 透明背景（让底层 Activity 内容可见，作为背景层时需要）
        webView.setBackgroundColor(Color.TRANSPARENT);

        // 注入 JSBridge
        webView.addJavascriptInterface(new WeatherBridge(this), "AndroidBridge");

        // WebView 客户端：页面内导航不跳转外部浏览器
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // 禁止任何 URL 跳转
            }
        });

        // 允许网页获取 Geolocation（备用，主要走 JSBridge）
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        setContentView(webView);

        // 加载天气主题页面
        webView.loadUrl("file:///android_asset/weather_theme/index.html");

        // 请求定位权限
        requestLocationPermission();
    }

    /** 全屏沉浸式：透明状态栏 + 透明导航栏 */
    private void setupImmersiveFullscreen() {
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
        int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                  | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                  | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                  | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                  | View.SYSTEM_UI_FLAG_FULLSCREEN
                  | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    /** 请求定位权限 */
    private void requestLocationPermission() {
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                new String[]{
                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                    android.Manifest.permission.ACCESS_COARSE_LOCATION
                }, REQUEST_LOCATION);
        } else {
            // 已授权，直接获取定位
            getLocationAndInject();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_LOCATION && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            getLocationAndInject();
        } else {
            // 权限拒绝，通知网页使用自主定位降级
            runOnUiThread(() -> webView.evaluateJavascript(
                "window.WeatherTheme && WeatherTheme.setOfflineMode(false);", null));
        }
    }

    /** 获取定位并注入网页 */
    @SuppressLint("MissingPermission")
    private void getLocationAndInject() {
        locationHelper.getLocation(new LocationHelper.LocationCallback() {
            @Override
            public void onLocationReceived(double latitude, double longitude) {
                runOnUiThread(() -> {
                    String js = String.format(Locale.US,
                        "window.WeatherTheme && WeatherTheme.setLocation(%f, %f);",
                        latitude, longitude);
                    webView.evaluateJavascript(js, null);

                    // 注入 Pexels Key
                    if (pexelsApiKey != null && !pexelsApiKey.isEmpty()) {
                        String keyJs = String.format(Locale.US,
                            "window.WeatherTheme && WeatherTheme.setPexelsKey('%s');",
                            pexelsApiKey.replace("'", "\\'"));
                        webView.evaluateJavascript(keyJs, null);
                    }
                });
            }

            @Override
            public void onLocationFailed() {
                // 定位失败，让网页自主降级（IP 定位）
                runOnUiThread(() -> webView.evaluateJavascript(
                    "console.warn('Android 定位失败，网页自主降级');", null));
            }
        });
    }

    /** JSBridge：网页可调用安卓原生能力 */
    private static class WeatherBridge {
        private final Context context;

        WeatherBridge(Context context) {
            this.context = context;
        }

        /** 网页请求刷新定位 */
        @JavascriptInterface
        public void refreshLocation() {
            if (context instanceof WeatherThemeActivity) {
                ((WeatherThemeActivity) context).getLocationAndInject();
            }
        }

        /** 网页获取设备性能信息（用于粒子数量自适应） */
        @JavascriptInterface
        public String getDeviceInfo() {
            try {
                JSONObject info = new JSONObject();
                info.put("cores", Runtime.getRuntime().availableProcessors());
                info.put("memoryMB", Runtime.getRuntime().maxMemory() / (1024 * 1024));
                info.put("isLowPower", ((android.os.PowerManager) context
                    .getSystemService(Context.POWER_SERVICE)).isPowerSaveMode());
                return info.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        /** 网页输出日志到 Logcat */
        @JavascriptInterface
        public void log(String message) {
            android.util.Log.d("WeatherTheme", message);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        // 恢复沉浸式
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
          | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
          | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
          | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
          | View.SYSTEM_UI_FLAG_FULLSCREEN
          | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}
