package com.dialysis.kidneynotes.weather;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.core.content.ContextCompat;

/**
 * 定位助手 —— 安卓原生获取经纬度
 *
 * 策略（优先级从高到低）：
 *   1. GPS_PROVIDER  —— 精度最高，但室外才可用
 *   2. NETWORK_PROVIDER —— 基站/WiFi 定位，室内可用
 *   3. FUSED_PROVIDER —— Google Play Services 融合定位（如已集成）
 *   4. getLastKnownLocation —— 缓存的最近一次定位（快速降级）
 *
 * 超时：8 秒内无定位结果则回调 onLocationFailed
 */
public class LocationHelper {

    public interface LocationCallback {
        void onLocationReceived(double latitude, double longitude);
        void onLocationFailed();
    }

    private static final long TIMEOUT_MS = 8000;
    private static final long MIN_DISTANCE_M = 1000; // 1km 更新一次
    private static final long MIN_TIME_MS = 60 * 60 * 1000; // 1 小时

    private final Context context;
    private final LocationManager locationManager;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private LocationCallback callback;
    private boolean hasResult = false;

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            if (hasResult) return;
            hasResult = true;
            cleanup();
            if (callback != null) {
                callback.onLocationReceived(location.getLatitude(), location.getLongitude());
            }
        }
        // 兼容旧版本
        @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
        @Override public void onProviderEnabled(String provider) {}
        @Override public void onProviderDisabled(String provider) {}
    };

    public LocationHelper(Context context) {
        this.context = context.getApplicationContext();
        this.locationManager = (LocationManager) this.context.getSystemService(Context.LOCATION_SERVICE);
    }

    @SuppressLint("MissingPermission")
    public void getLocation(LocationCallback callback) {
        this.callback = callback;
        this.hasResult = false;

        if (!hasLocationPermission()) {
            callback.onLocationFailed();
            return;
        }

        // 超时定时器
        handler.postDelayed(() -> {
            if (!hasResult) {
                Location last = getLastKnownLocation();
                if (last != null) {
                    hasResult = true;
                    cleanup();
                    callback.onLocationReceived(last.getLatitude(), last.getLongitude());
                } else {
                    hasResult = true;
                    cleanup();
                    callback.onLocationFailed();
                }
            }
        }, TIMEOUT_MS);

        // 优先 NETWORK（室内快速定位），再请求 GPS（精度提升）
        try {
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER, MIN_TIME_MS, MIN_DISTANCE_M, locationListener, Looper.getMainLooper());
            }
        } catch (SecurityException ignored) {}

        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER, MIN_TIME_MS, MIN_DISTANCE_M, locationListener, Looper.getMainLooper());
            }
        } catch (SecurityException ignored) {}

        // 立即尝试 getLastKnownLocation（快速降级）
        Location last = getLastKnownLocation();
        if (last != null && System.currentTimeMillis() - last.getTime() < 30 * 60 * 1000) {
            // 30 分钟内的缓存定位直接用
            if (!hasResult) {
                hasResult = true;
                cleanup();
                callback.onLocationReceived(last.getLatitude(), last.getLongitude());
            }
        }
    }

    @SuppressLint("MissingPermission")
    private Location getLastKnownLocation() {
        if (!hasLocationPermission()) return null;
        Location best = null;
        long bestTime = 0;
        try {
            for (String provider : locationManager.getProviders(true)) {
                Location l = locationManager.getLastKnownLocation(provider);
                if (l != null && l.getTime() > bestTime) {
                    best = l;
                    bestTime = l.getTime();
                }
            }
        } catch (SecurityException ignored) {}
        return best;
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void cleanup() {
        try {
            locationManager.removeUpdates(locationListener);
        } catch (SecurityException ignored) {}
        handler.removeCallbacksAndMessages(null);
    }
}
