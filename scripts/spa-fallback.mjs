// GitHub Pages has no rewrites. Serving the app as 404.html too means a deep link such as
// /pillow/p/two-sum?chapter=compare still opens the app, which then routes on the client.
import { copyFileSync } from "node:fs";
copyFileSync("dist/index.html", "dist/404.html");
