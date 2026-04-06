export default async function handler(req, res) {
  const { id } = req.query;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/polls?id=eq.${id}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const data = await response.json();
    const poll = data[0];

    if (!poll) {
      return res.status(404).send("Poll not found");
    }

    const appUrl = process.env.VITE_APP_URL || "https://ceemediablog.vercel.app";
    const title = poll.question || "CEE MEDIA VOTE";
    const description = poll.description || "Cast your vote on CEE MEDIA!";
    const image = poll.image || `${appUrl}/default.jpg`;
    const url = `${appUrl}/vote?id=${id}`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "s-maxage=86400");

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          
          <!-- Open Graph / Facebook -->
          <meta property="og:type" content="website" />
          <meta property="og:url" content="${url}" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${image}" />

          <!-- Twitter -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:url" content="${url}" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${image}" />

          <script>
            window.location.href = "${url}";
          </script>
        </head>
        <body>
          <p>Redirecting to <a href="${url}">${title}</a>...</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("Preview Error:", error);
    res.status(500).send("Preview Error");
  }
}
