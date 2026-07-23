import { PANNELLUM_INLINE_CSS, PANNELLUM_INLINE_JS } from '@/components/panorama-pannellum-inline';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import WebView from 'react-native-webview';

function directoryOf(fileUri: string): string {
  const idx = fileUri.lastIndexOf('/');
  return fileUri.slice(0, idx + 1);
}

function mimeFromUri(fileUri: string): string {
  const m = fileUri.split('?')[0].match(/\.(jpe?g|png|webp|gif)$/i);
  const ext = (m?.[1] ?? 'jpg').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function buildPannellumHtml(imageUrl: string, panoramaHalf: boolean): string {
  const config: Record<string, unknown> = {
    type: 'equirectangular',
    panorama: imageUrl,
    autoLoad: true,
    showControls: true,
    showFullscreenCtrl: true,
    crossOrigin: 'anonymous',
    hfov: 100,
    minHfov: 50,
    maxHfov: 120,
    pitch: 0,
    yaw: 0,
    compass: true,
  };
  if (panoramaHalf) {
    config.minYaw = -90;
    config.maxYaw = 90;
  }
  const configJson = JSON.stringify(config);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"/>
  <style>${PANNELLUM_INLINE_CSS}</style>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: #000;
      -webkit-overflow-scrolling: auto;
    }
    #panorama {
      margin: 0;
      padding: 0;
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      overflow: hidden;
      box-sizing: border-box;
      background: #000;
    }
    .pnlm-container {
      max-width: 100% !important;
      max-height: 100% !important;
    }
    .pnlm-render-container {
      max-width: 100% !important;
      max-height: 100% !important;
    }
  </style>
</head>
<body>
  <div id="panorama"></div>
  <script>${PANNELLUM_INLINE_JS}</script>
  <script>
    (function () {
      try {
        pannellum.viewer('panorama', ${configJson});
      } catch (e) {}
    })();
  </script>
</body>
</html>`;
}

export type PanoramaWebViewProps = {
  uri: string;
  panoramaHalf?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function PanoramaWebView({ uri, panoramaHalf = false, style }: PanoramaWebViewProps) {
  const isLocalFile = uri.startsWith('file://');
  const remoteHtml = useMemo(
    () => (isLocalFile ? null : buildPannellumHtml(uri, panoramaHalf)),
    [isLocalFile, uri, panoramaHalf],
  );

  // Pannellum loads equirectangular panoramas via XHR + blob and treats the load as
  // failed unless `xhr.status === 200`. A `file://` XHR resolves with `status === 0`
  // in WKWebView (there's no real HTTP transaction for local files), so it always hits
  // pannellum's own fileAccessError for offline panoramas — independent of whether the
  // WebView actually has read access to the file. Embedding the image as a `data:` URI
  // sidesteps this: `data:` XHRs resolve with status 200. The HTML is still written to
  // disk and loaded via `source={{ uri }}` (not `loadHTMLString`) to avoid its size cap.
  const [localHtmlUri, setLocalHtmlUri] = useState<string | null>(null);

  useEffect(() => {
    if (!isLocalFile) {
      setLocalHtmlUri(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const dataUri = `data:${mimeFromUri(uri)};base64,${base64}`;
        const html = buildPannellumHtml(dataUri, panoramaHalf);
        const dest = `${directoryOf(uri)}__panorama_viewer.html`;
        await FileSystem.writeAsStringAsync(dest, html);
        if (!cancelled) setLocalHtmlUri(dest);
      } catch {
        if (!cancelled) setLocalHtmlUri(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLocalFile, uri, panoramaHalf]);

  if (isLocalFile && !localHtmlUri) {
    return <View style={[styles.wrap, style]} />;
  }

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        key={uri}
        source={isLocalFile && localHtmlUri ? { uri: localHtmlUri } : { html: remoteHtml! }}
        allowingReadAccessToURL={isLocalFile ? directoryOf(uri) : undefined}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#000',
    minHeight: 0,
    alignSelf: 'stretch',
  },
  web: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    backgroundColor: '#000',
  },
});
