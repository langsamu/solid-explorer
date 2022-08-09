import {OkDialog} from "./OkDialog.js"
import {OkCancelDialog} from "./OkCancelDialog.js"
import {InputDialog} from "./InputDialog.js"
import {SelectDialog} from "./SelectDialog.js"
import {ContextMenuDialog} from "./ContextMenuDialog.js"

customElements.define("solid-ok-dialog", OkDialog, {extends: "dialog"})
customElements.define("solid-ok-cancel-dialog", OkCancelDialog, {extends: "dialog"})
customElements.define("solid-input-dialog", InputDialog, {extends: "dialog"})
customElements.define("solid-select-dialog", SelectDialog, {extends: "dialog"})
customElements.define("solid-context-dialog", ContextMenuDialog, {extends: "dialog"})
