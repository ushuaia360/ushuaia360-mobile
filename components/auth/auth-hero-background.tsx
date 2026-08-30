import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Dimensions, Platform, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

const BG_VIDEO = require('@/assets/images/login/bgvideo.mp4');
const BG_POSTER = require('@/assets/images/login/bgvideo-poster.jpg');

type AuthHeroBackgroundProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function escapeHtmlAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildVideoHtml(videoSrc: string, posterSrc: string) {
  const v = escapeHtmlAttr(videoSrc);
  const p = escapeHtmlAttr(posterSrc);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"/>
<style>
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  position: fixed;
  inset: 0;
}
#v {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: cover;
}
</style>
</head>
<body>
<video id="v" src="${v}" poster="${p}" playsinline webkit-playsinline muted loop autoplay></video>
<script>
(function () {
  var el = document.getElementById('v');
  var started = false;

  function fit() {
    var w = window.innerWidth || document.documentElement.clientWidth || screen.width;
    var h = window.innerHeight || document.documentElement.clientHeight || screen.height;
    document.documentElement.style.width = w + 'px';
    document.documentElement.style.height = h + 'px';
    document.body.style.width = w + 'px';
    document.body.style.height = h + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 300); });

  function post() {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('playing');
  }

  function tryPlay() {
    if (started) return;
    var p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(function () { started = true; post(); }).catch(function () {});
    }
  }

  el.addEventListener('playing', function () { started = true; post(); });
  el.addEventListener('canplay', tryPlay);
  el.addEventListener('loadeddata', tryPlay);
  el.addEventListener('loadedmetadata', tryPlay);

  tryPlay();
  setTimeout(tryPlay, 200);
  setTimeout(tryPlay, 800);
  setTimeout(tryPlay, 2000);
})();
</script>
</body>
</html>`;
}

/**
 * Fondo login/registro: video en WebView (HTML5) sin expo-av. En web, solo poster.
 */
export function AuthHeroBackground({ children, style }: AuthHeroBackgroundProps) {
  const { width: ww, height: wh } = useWindowDimensions();
  const { width: sw, height: sh } = Dimensions.get('screen');
  const canvasW = Math.max(ww, sw);
  const canvasH = Math.max(wh, sh);
  const [posterHidden, setPosterHidden] = useState(false);
  const [videoHtml, setVideoHtml] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    (async () => {
      const videoAsset = Asset.fromModule(BG_VIDEO);
      const posterAsset = Asset.fromModule(BG_POSTER);
      await Promise.all([videoAsset.downloadAsync(), posterAsset.downloadAsync()]);
      const vUri = videoAsset.localUri ?? videoAsset.uri;
      const pUri = posterAsset.localUri ?? posterAsset.uri;
      if (!cancelled && vUri && pUri) {
        setVideoHtml(buildVideoHtml(vUri, pUri));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onWebMessage = useCallback((e: { nativeEvent: { data: string } }) => {
    if (e.nativeEvent.data === 'playing') setPosterHidden(true);
  }, []);

  return (
    <View style={[styles.root, style]}>
      {Platform.OS !== 'web' && videoHtml ? (
        <WebView
          source={{ html: videoHtml, baseUrl: 'file:///' }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: canvasW,
            height: canvasH,
            backgroundColor: '#000',
            zIndex: 0,
          }}
          originWhitelist={['*']}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          pointerEvents="none"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          domStorageEnabled
          javaScriptEnabled
          contentMode="mobile"
          onMessage={onWebMessage}
        />
      ) : null}
      {!posterHidden ? (
        <View style={[StyleSheet.absoluteFillObject, styles.posterWrap]} pointerEvents="none">
          <Image
            source={BG_POSTER}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessible={false}
          />
        </View>
      ) : null}
      <View style={styles.foreground} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  posterWrap: {
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});
