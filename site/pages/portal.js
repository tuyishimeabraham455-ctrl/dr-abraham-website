// ============================================================
//  PORTAL — multi-user dashboard shell (app lives in portal-app.js)
// ============================================================
const { page, icon, rel } = require('../lib/layout');

module.exports = () => {
  const depth = 1, r = rel(depth);
  const body = `
<section class="portal" id="portal" aria-live="polite">
  <div class="portal-login" id="pLogin" hidden>
    <div class="card-form portal-login-box">
      <span class="logo-mark">Yo</span>
      <h1 class="h3" id="pAuthTitle">Welcome back</h1>
      <div class="auth-tabs" role="tablist" aria-label="Sign in or create an account">
        <button type="button" role="tab" id="tabSignin" aria-controls="pLoginForm" aria-selected="true">Sign in</button>
        <button type="button" role="tab" id="tabSignup" aria-controls="pSignupForm" aria-selected="false">Create account</button>
      </div>

      <form id="pLoginForm" role="tabpanel" aria-labelledby="tabSignin">
        <div class="field"><label for="pEmail">Email</label><input id="pEmail" name="email" type="email" required autocomplete="email"/></div>
        <div class="field"><label for="pPass">Password</label><span class="pw"><input id="pPass" name="password" type="password" required autocomplete="current-password"/><button type="button" class="pw-show" aria-label="Show password" aria-pressed="false">Show</button></span></div>
        <button class="btn btn-dark btn-block">Sign in ${icon('arrow')}</button>
        <p class="form-msg" id="pLoginMsg" aria-live="polite"></p>
        <p class="fine">Forgot your password? Email the team and we'll reset it.</p>
        <p class="auth-switch">New here? <button type="button" class="linkish" data-auth="signup">Create an account</button></p>
      </form>

      <form id="pSignupForm" role="tabpanel" aria-labelledby="tabSignup" hidden>
        <div class="field"><label for="sName">Full name</label><input id="sName" name="name" required maxlength="120" autocomplete="name"/></div>
        <div class="field"><label for="sEmail">Email</label><input id="sEmail" name="email" type="email" required maxlength="160" autocomplete="email"/></div>
        <div class="field"><label for="sPass">Password <small>(at least 10 characters)</small></label><span class="pw"><input id="sPass" name="password" type="password" required minlength="10" autocomplete="new-password"/><button type="button" class="pw-show" aria-label="Show password" aria-pressed="false">Show</button></span></div>
        <div class="field"><label for="sPass2">Confirm password</label><input id="sPass2" name="password2" type="password" required minlength="10" autocomplete="new-password"/></div>
        <div class="hp" aria-hidden="true"><label for="sWeb">Website</label><input id="sWeb" name="website" tabindex="-1" autocomplete="off"/></div>
        <label class="check"><input type="checkbox" name="agree" required/> <span>I agree to the <a href="${r}terms/" target="_blank">Terms</a> and <a href="${r}privacy/" target="_blank">Privacy Policy</a>.</span></label>
        <button class="btn btn-gold btn-block">Create my account ${icon('arrow')}</button>
        <p class="form-msg" id="pSignupMsg" aria-live="polite"></p>
        <p class="auth-switch">Already have an account? <button type="button" class="linkish" data-auth="signin">Sign in</button></p>
      </form>
    </div>
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
  return page({ path: 'portal/', depth, title: 'Sign in or create an account | The Business of You', description: 'Sign in or create your account for The Business of You portal: messages, assignments, community and resources.', body, bodyClass: 'page-portal', noindex: true, scripts: ['assets/js/portal-app.js'] });
};
