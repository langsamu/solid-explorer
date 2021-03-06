import {Oidc} from "./Vocabulary.js"
import {OidcClient} from "./OidcClient.js"

addEventListener("load", onLoad)

async function onLoad() {
    const query = new URLSearchParams(location.search)
    const idpParam = getFromQueryOrSession("idp", query)
    const keyParam = getFromQueryOrSession("key", query)

    const redirectUri = new URL(location.pathname, location.origin)
    const oidcClient = new OidcClient(idpParam, redirectUri)

    // Use public client ID without secret by default but register client dynamically if on localhost.
    let client_id = new URL("./id.jsonld", location), client_secret
    if (["localhost", "127.0.0.1", "::1"].includes(location.hostname)) {
        ({client_id, client_secret} = await oidcClient.register())
    }

    if (query.has(Oidc.Code)) {
        await processOidcCode(oidcClient, query.get(Oidc.Code), client_id, client_secret, keyParam)
    } else {
        await oidcClient.authorize(client_id)
    }
}

async function processOidcCode(oidcClient, code, client_id, client_secret, keyParam) {
    const response = await oidcClient.exchangeToken(code, client_id, client_secret)
    const responseJson = JSON.stringify(response)
    const responseBuffer = new TextEncoder().encode(responseJson)

    const hostAlgorithm = {name: "RSA-OAEP", hash: {name: "SHA-256"}}
    const hostKeyString = JSON.parse(atob(keyParam))
    const hostKey = await crypto.subtle.importKey("jwk", hostKeyString, hostAlgorithm, false, ["wrapKey"])

    const myAlgorithm = {name: "AES-GCM", length: 256, iv: crypto.getRandomValues(new Uint8Array(12))}
    const myKey = await crypto.subtle.generateKey(myAlgorithm, true, ["encrypt", "decrypt"])

    const encryptedOidcTokenResponse = await crypto.subtle.encrypt(myAlgorithm, myKey, responseBuffer)
    const myEncryptedKey = await crypto.subtle.wrapKey("jwk", myKey, hostKey, hostAlgorithm)

    const message = {
        type: "authorized",
        algorithm: myAlgorithm,
        key: myEncryptedKey,
        response: encryptedOidcTokenResponse
    }

    opener.postMessage(message, location.origin)
    close()
}

function getFromQueryOrSession(name, query) {
    if (query.has(name)) {
        sessionStorage.setItem(name, query.get(name))
    }

    return sessionStorage.getItem(name)
}
