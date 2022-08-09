import "../dialog/index.js"
import {SolidOidcUi} from "./SolidOidcUi.js"
import {AuthenticationDialog} from "./AuthenticationDialog.js"

export {OidcCredentialManager} from "./OidcCredentialManager.js"
export {OidcClient} from "./OidcClient.js"

customElements.define("solid-oidc-ui", SolidOidcUi)
customElements.define("solid-authentication-dialog", AuthenticationDialog, {extends: "dialog"})
