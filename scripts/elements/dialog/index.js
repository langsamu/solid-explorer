import {OkDialog} from "./OkDialog.js"
import {OkCancelDialog} from "./OkCancelDialog.js"
import {InputDialog} from "./InputDialog.js"

customElements.define("solid-ok-dialog", OkDialog, {extends: "dialog"})
customElements.define("solid-ok-cancel-dialog", OkCancelDialog, {extends: "dialog"})
customElements.define("solid-input-dialog", InputDialog, {extends: "dialog"})
