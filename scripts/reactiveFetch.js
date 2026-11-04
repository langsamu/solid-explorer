import "@solid/reactive-authentication/registerElements"
import {
    CachingAuthorizationServerProvider,
    CachingClientProvider,
    ClientIdClientProvider,
    DPoPTokenProvider,
    DynamicRegistrationClientProvider,
    ReactiveFetchManager,
    XASProvider
} from "@solid/reactive-authentication"
import {PersistedIssuerProvider} from "./PersistedIssuerProvider.js"

const codeProvider = document.querySelector("authorization-code-flow")
const issuerPicker = document.querySelector("idp-picker")

const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
const clientProvider = new CachingClientProvider(
    isLocal
        ? new DynamicRegistrationClientProvider
        : new ClientIdClientProvider(new URL("id.jsonld", document.baseURI)))

const asProvider = new CachingAuthorizationServerProvider(new XASProvider(new PersistedIssuerProvider(issuerPicker)))
const callbackUri = new URL("callback.html", document.baseURI).href

const tokenProvider = new DPoPTokenProvider(callbackUri, codeProvider, asProvider, clientProvider)

export const reactiveFetch = new ReactiveFetchManager([tokenProvider]).fetch
