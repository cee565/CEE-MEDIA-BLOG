import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Supabase config for SEO redirects
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  // SEO Redirect Routes (Mocking the Vercel API functionality)
  app.get("/api/:type/:id", async (req, res) => {
    const { type, id } = req.params;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.redirect("/");
    }

    try {
      let table = "";
      let title = "CEE MEDIA BLOG";
      let description = "Official Campus Voice, News and Updates.";
      let image = "";
      let redirectPath = "";

      if (type === "vote") {
        table = "commission_posts";
        redirectPath = "/vote";
      } else if (type === "blog") {
        table = "blogs";
        redirectPath = "/blog";
      } else if (type === "conversation") {
        table = "messages";
        redirectPath = "/confessions";
      } else if (type === "post") {
        table = "blogs";
        redirectPath = "/blog";
      } else {
        return res.redirect("/");
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      const data = await response.json();
      const entity = data[0];

      if (!entity) {
        return res.redirect("/");
      }

      const appUrl = process.env.VITE_APP_URL || `http://localhost:${PORT}`;
      
      if (type === "vote") {
        title = entity.title || "CEE MEDIA BLOG VOTE";
        description = `Vote now: ${entity.title} | CEE MEDIA BLOG`;
      } else if (type === "blog" || type === "post") {
        title = entity.title || "CEE MEDIA BLOG";
        description = (entity.content || "").slice(0, 150).replace(/[#*`]/g, "");
      } else if (type === "conversation") {
        title = "Anonymous Confession | CEE MEDIA BLOG";
        description = (entity.content || "").slice(0, 150);
      }

      image = entity.image_url || entity.image || "https://i.ibb.co/vzB7Z6N/ceemedia-logo.png";
      const url = `${appUrl}${redirectPath}?id=${id}`;

      res.setHeader("Content-Type", "text/html");
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta property="og:type" content="website" />
            <meta property="og:url" content="${url}" />
            <meta property="og:title" content="${title}" />
            <meta property="og:description" content="${description}" />
            <meta property="og:image" content="${image}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content="${url}" />
            <meta name="twitter:title" content="${title}" />
            <meta name="twitter:description" content="${description}" />
            <meta name="twitter:image" content="${image}" />
            <script>window.location.href = "${url}";</script>
          </head>
          <body>
            <p>Redirecting to <a href="${url}">${title}</a>...</p>
          </body>
        </html>
      `);

    } catch (error) {
      console.error("SEO Redirect Error:", error);
      res.status(500).send("Server Error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serving static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
