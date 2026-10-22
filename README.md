# Dr. Abraham — Website

Personal brand site for Dr. Abraham: home, about, programs, book, blog and contact pages,
with an Express + SQLite backend for newsletter sign-ups, contact inquiries and an admin dashboard.

## Run locally

```bash
npm install
npm start        # http://localhost:3000
```

Admin dashboard: http://localhost:3000/admin

## Hosting

- **GitHub Pages** serves the static pages (design, images, video). Forms and the admin
  dashboard need the Node server and do not work there.
- To run the full site (forms + admin), deploy to a Node host such as Render:
  build command `npm install`, start command `npm start`.
