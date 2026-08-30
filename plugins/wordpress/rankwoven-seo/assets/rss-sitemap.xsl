<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:content="http://purl.org/rss/1.0/modules/content/">
    <xsl:output method="html" encoding="UTF-8" omit-xml-declaration="yes" />

    <xsl:template match="/">
        <html lang="zh-Hant">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title><xsl:value-of select="rss/channel/title" /> RSS Sitemap</title>
                <style>
                    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
                    * { box-sizing: border-box; }
                    body { margin: 0; background: #fff; color: #151515; font-size: 16px; line-height: 1.55; }
                    main { width: 100%; max-width: 1440px; margin: 0 auto; padding: 28px 32px 48px; }
                    .feed-header { padding-bottom: 20px; border-bottom: 1px solid #e7e7e7; }
                    .feed-header h1 { margin: 0; font-size: clamp(24px, 3vw, 34px); line-height: 1.2; }
                    .feed-header h1 a { color: #0876cf; text-decoration: none; }
                    .feed-header h1 a:hover { text-decoration: underline; }
                    .feed-description { max-width: 900px; margin: 10px 0 0; color: #555; }
                    .feed-list { margin-top: 4px; }
                    .entry { padding: 26px 0 28px; border-bottom: 2px dotted #d8d8d8; }
                    .entry h2 { margin: 0; font-size: clamp(19px, 2.2vw, 27px); line-height: 1.35; }
                    .entry h2 a { color: #0876cf; text-decoration: none; }
                    .entry h2 a:hover { text-decoration: underline; }
                    .entry-date { display: flex; align-items: center; gap: 8px; margin: 12px 0 14px; color: #222; font-size: 15px; }
                    .clock-icon { position: relative; display: inline-block; width: 16px; height: 16px; border: 2px solid #888; border-radius: 50%; flex: 0 0 16px; }
                    .clock-icon::before { content: ""; position: absolute; left: 6px; top: 2px; width: 1px; height: 5px; background: #888; }
                    .clock-icon::after { content: ""; position: absolute; left: 6px; top: 7px; width: 4px; height: 1px; background: #888; transform: rotate(28deg); transform-origin: left center; }
                    .entry-content { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 18px; align-items: start; }
                    .entry-content.no-image { display: block; }
                    .entry-image { width: 88px; height: 88px; object-fit: cover; border-radius: 4px; background: #f1f1f1; }
                    .entry-summary { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
                    .entry-summary:empty { display: none; }
                    @media (max-width: 640px) {
                        main { padding: 22px 16px 36px; }
                        .entry { padding: 22px 0 24px; }
                        .entry-content { grid-template-columns: 64px minmax(0, 1fr); gap: 12px; }
                        .entry-image { width: 64px; height: 64px; }
                    }
                </style>
            </head>
            <body>
                <main>
                    <header class="feed-header">
                        <h1>
                            <a href="{rss/channel/link}"><xsl:value-of select="rss/channel/title" /></a>
                        </h1>
                        <p class="feed-description"><xsl:value-of select="rss/channel/description" /></p>
                    </header>
                    <section class="feed-list" aria-label="RSS Sitemap entries">
                        <xsl:for-each select="rss/channel/item">
                            <article class="entry">
                                <h2>
                                    <a href="{link}"><xsl:value-of select="title" /></a>
                                </h2>
                                <p class="entry-date"><span class="clock-icon" aria-hidden="true"></span><xsl:value-of select="pubDate" /></p>
                                <div>
                                    <xsl:choose>
                                        <xsl:when test="enclosure/@url">
                                            <div class="entry-content">
                                                <img class="entry-image" src="{enclosure/@url}" alt="{title}" loading="lazy" />
                                                <p class="entry-summary"><xsl:value-of select="description" /></p>
                                            </div>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <div class="entry-content no-image">
                                                <p class="entry-summary"><xsl:value-of select="description" /></p>
                                            </div>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </div>
                            </article>
                        </xsl:for-each>
                    </section>
                </main>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
