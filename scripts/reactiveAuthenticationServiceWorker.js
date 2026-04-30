import {OidcCredentialManager} from "../packages/oidc/OidcCredentialManager.js"

const oidc = new OidcCredentialManager
oidc.addUi(document.body)

navigator.serviceWorker.addEventListener("message", onWorkerMessage)

await navigator.serviceWorker.register("./worker.js", {type: "module"})
await navigator.serviceWorker.ready

async function onWorkerMessage(e) {
    console.debug("onWorkerMessage", e)

    if (e.data === "needCredentials") {
        console.debug("onWorkerMessage needCredentials")

        e.ports[0].postMessage(await oidc.getCredentials())
    }
}
