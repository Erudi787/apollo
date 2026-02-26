import { useState, useEffect } from 'react';

/**
 * A custom hook that detects if the user is currently inside an in-app browser WebView
 * commonly found in social media apps like Facebook, Messenger, Instagram, or TikTok.
 * 
 * Google explicitly blocks OAuth requests originating from these WebViews 
 * (Error 403: disallowed_useragent).
 */
export function useInAppBrowser() {
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);

    useEffect(() => {
        const checkBrowser = () => {
            const rules = [
                // Facebook App & Messenger
                'FBAV', 'FBAN',
                // Instagram
                'Instagram',
                // TikTok
                'ByteLocale', 'ByteFullLocale', 'TikTok',
                // Snapchat
                'Snapchat',
                // Twitter/X (Sometimes triggers webview auth issues)
                'Twitter',
                // Line / WeChat
                'Line', 'MicroMessenger'
            ];

            const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
            if (!ua) return false;

            // Check if any of the rules match the User-Agent string
            return rules.some(rule => new RegExp(rule, 'i').test(ua));
        };

        setIsInAppBrowser(checkBrowser());
    }, []);

    return isInAppBrowser;
}
