# Despliegue de la web

`pnpm --filter web build` genera `apps/web/dist`. Ese directorio es lo que se publica: no hay servidor Node para el frontend.

El router es de cliente (`createBrowserRouter`), así que **el hosting debe devolver `index.html` con estado 200** en cualquier ruta que no sea un fichero real. Sin eso, un F5 en `/account` o `/admin/users` da 404.

| Hosting          | Fichero                      | Qué hace                                      |
| ---------------- | ---------------------------- | --------------------------------------------- |
| Vercel           | `apps/web/vercel.json`       | Rewrite de todas las rutas a `/index.html`.   |
| Netlify          | `apps/web/public/_redirects` | `/* /index.html 200`. Vite lo copia a `dist`. |
| Nginx            | `deploy/nginx.conf.example`  | `try_files $uri $uri/ /index.html`.           |
| Cloudflare Pages | ninguno                      | Pages ya aplica fallback SPA por defecto.     |

Notas:

- El fallback debe ser **200**, no 301 ni 302. Un redirect cambia la URL y rompe los enlaces profundos.
- Los assets de `/assets/` llevan hash en el nombre: se pueden cachear un año.
- `VITE_API_URL` se inyecta en tiempo de build. Si cambia la URL de la API, hay que reconstruir.
