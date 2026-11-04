// ============================================================
//  PORTAL — multi-user dashboard shell (app lives in portal-app.js)
// ============================================================
const { page, icon, rel } = require('../lib/layout');

module.exports = () => {
  const depth = 1, r = rel(depth);
  const body = `
<section class="portal" id="portal" aria-live="polite">
  <div class="portal-login" id="pLogin" hidden>
    <form class="card-form portal-login-box" id="pLoginForm">
      <span class="logo-mark">Yo</span>
      <h1 class="h3">Sign in to your portal</h1>
      <p class="fine">For Yo's team, clients and students. New accounts are created by the team.</p>
      <div class="field"><label for="pEmail">Email</label><input id="pEmail" name="email" type="email" required autocomplete="email"/></div>
      <div class="field"><label for="pPass">Password</label><input id="pPass" name="password" type="password" required autocomplete="current-password"/></div>
      <button class="btn btn-dark btn-block">Sign in ${icon('arrow')}</button>
      <p class="form-msg" id="pLoginMsg" aria-live="polite"></p>
      <p class="fine">Forgot your password? Email the team and we'll reset it.</p>
    </form>
  </div>
  <div class="portal-app" id="pApp" hidden>
    <aside class="p-side">
      <div class="p-user"><span class="p-ava" id="pAva">Yo</span><div><b id="pName"></b><span class="p-role" id="pRole"></span></div></div>
      <nav class="p-nav" id="pNav" aria-label="Portal"></nav>
      <button type="button" class="btn btn-ghost-dark btn-sm btn-block" id="pLogout">Sign out</button>
    </aside>
    <div class="p-main"><header class="p-head"><h1 class="h2" id="pTitle"></h1><div id="pActions"></div></header><div id="pView" class="p-view"></div></div>
  </div>
  <noscript><p class="wrap">The portal needs JavaScript.</p></noscript>
</section>`;
  return page({ path: 'portal/', depth, title: 'Portal | The Business of You', description: 'Sign in to The Business of You portal for clients, students and Yo\'s team.', body, bodyClass: 'page-portal', noindex: true, scripts: ['assets/js/portal-app.js'] });
};
