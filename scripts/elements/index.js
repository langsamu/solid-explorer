import "./dialog/index.js"

import {AppElement} from "./AppElement.js"
import {TreeElement} from "./TreeElement.js"
import {ContainerViewElement} from "./ContainerViewElement.js"
import {ContainerViewItemElement} from "./ContainerViewItemElement.js"
import {ResourceViewerElement} from "./ResourceViewerElement.js"
import {AddressBarElement} from "./AddressBarElement.js"
import {CrumbTrailElement} from "./CrumbTrailElement.js"
import {AuthenticationDialog} from "./AuthenticationDialog.js"
import {UploadDialog} from "./UploadDialog.js"

customElements.define("solid-app", AppElement, {extends: "body"})
customElements.define("solid-tree", TreeElement, {extends: "details"})
customElements.define("solid-container-view", ContainerViewElement, {extends: "div"})
customElements.define("solid-container-view-item", ContainerViewItemElement, {extends: "div"})
customElements.define("solid-resource-viewer", ResourceViewerElement, {extends: "iframe"})
customElements.define("solid-address-bar", AddressBarElement, {extends: "form"})
customElements.define("solid-crumb-trail", CrumbTrailElement, {extends: "ul"})
customElements.define("solid-authentication-dialog", AuthenticationDialog, {extends: "dialog"})
customElements.define("solid-upload-dialog", UploadDialog, {extends: "dialog"})
